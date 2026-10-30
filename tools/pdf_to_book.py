"""Converte o PDF de uma história num livro para o leitor (livro.html).

Uso:
    python pdf_to_book.py historia.pdf slug "Título"

Gera:
    assets/books/<slug>.js        -> window.BOOK = { slug, title, dedication, blocks, notes }
    assets/books/<slug>/NN.jpg    -> ilustrações

Trata:
  - parágrafos (pelo recuo da primeira linha) e parágrafos partidos entre páginas;
  - itálicos (pensamentos das personagens);
  - notas de rodapé: o número em expoente no texto e a explicação no fundo da página;
  - dedicatória no topo da primeira página ("para a Diana");
  - teatro (falas "Rainha: …" com o texto ao lado);
  - rodapés ("Página 1 de 5", site, ©), que são ignorados.
"""

import collections
import html
import io
import json
import re
import sys
from pathlib import Path

import fitz  # PyMuPDF
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
FOOTER = re.compile(r"(Página\s*\d+\s*de\s*\d+|www\.|©|direitos reservados)", re.I)
SPEAKER = re.compile(r"^([A-ZÀ-Ý][\wÀ-ÿ .'-]{0,28}):\s")
MAX_WIDTH = 1400
SMALL_IMAGE = 700   # imagens mais estreitas ficam dentro das margens (não esticam)


def span_text(s):
    return s["text"].replace(" ", " ")


def is_marker(span, body):
    return bool(span["flags"] & 1) and span["text"].strip().isdigit() and span["size"] < body - 1


def line_size(line):
    sizes = collections.Counter()
    for s in line["spans"]:
        if s["text"].strip() and not s["flags"] & 1:
            sizes[round(s["size"])] += len(s["text"].strip())
    return sizes.most_common(1)[0][0] if sizes else 0


def plain(line):
    return re.sub(r"\s+", " ", "".join(span_text(s) for s in line["spans"])).strip()


def body_size(doc):
    sizes = collections.Counter()
    for page in doc:
        for b in page.get_text("dict")["blocks"]:
            if b["type"] == 0:
                for l in b["lines"]:
                    for s in l["spans"]:
                        sizes[round(s["size"])] += len(s["text"].strip())
    return sizes.most_common(1)[0][0]


def to_html(line, body, notes_on_page, notes, words_before):
    """Linha -> HTML com <em> por palavra (para se poder partir por palavras) e marcas de nota."""
    out = ""
    for s in line["spans"]:
        text = span_text(s)
        if not text.strip() and not text:
            continue
        if is_marker(s, body):
            n = int(text.strip())
            note = notes_on_page.get(n)
            if note is not None:
                notes.append({"n": len(notes) + 1, "word": words_before(out), "text": note})
                out += f'<sup class="fn" data-n="{len(notes)}">{len(notes)}</sup>'
            continue
        esc = html.escape(text, quote=False)
        if s["flags"] & 2:
            esc = re.sub(r"(\S+)", r"<em>\1</em>", esc)
        out += esc
    return re.sub(r"\s+", " ", out).strip()


def last_word(fragment_so_far):
    def f(current):
        text = re.sub(r"<[^>]+>", "", fragment_so_far() + " " + current)
        words = re.findall(r"[\wÀ-ÿ'’-]+", text)
        return words[-1] if words else ""
    return f


def main(pdf_path, slug, title):
    doc = fitz.open(pdf_path)
    out_dir = ROOT / "assets" / "books" / slug
    out_dir.mkdir(parents=True, exist_ok=True)
    for old in out_dir.glob("*.jpg"):
        old.unlink()

    body = body_size(doc)

    # Margem esquerda do texto e (no teatro) a posição das falas.
    xs = collections.Counter()
    speech_x = collections.Counter()
    for page in doc:
        lines = [l for b in page.get_text("dict")["blocks"] if b["type"] == 0 for l in b["lines"]
                 if plain(l) and abs(line_size(l) - body) <= 1]
        for l in lines:
            xs[round(l["bbox"][0])] += 1
        for a in lines:
            if re.fullmatch(r"[A-ZÀ-Ý][\wÀ-ÿ .'-]{0,28}:", plain(a)):
                for b in lines:
                    if b is not a and abs(b["bbox"][1] - a["bbox"][1]) < 3 and b["bbox"][0] > a["bbox"][0]:
                        speech_x[round(b["bbox"][0])] += 1
    margin = xs.most_common(1)[0][0]
    script = sum(speech_x.values()) >= 3
    sx = speech_x.most_common(1)[0][0] if script else None

    # Notas de rodapé de todo o documento. O Word às vezes passa uma nota (ou o fim dela)
    # para o fundo da página seguinte, por isso junta-se tudo antes de ler o texto.
    page_notes, all_notes, last_n = [], {}, None
    for page in doc:
        found = {}
        for b in sorted(page.get_text("dict")["blocks"], key=lambda b: b["bbox"][1]):
            if b["type"] != 0:
                continue
            for l in b["lines"]:
                t = plain(l)
                if not t or line_size(l) >= body - 1 or FOOTER.search(t) or l["bbox"][1] < page.rect.height * 0.45:
                    continue
                m = re.match(r"^(\d+)\s*(.*)$", t)
                first = next((s for s in l["spans"] if s["text"].strip()), None)
                if m and first and first["text"].strip().isdigit():
                    last_n = int(m.group(1))
                    found[last_n] = m.group(2).strip()
                elif last_n is not None:
                    if last_n in found:
                        found[last_n] += " " + t
                    else:
                        all_notes[last_n] += " " + t   # continuação de uma nota da página anterior
        page_notes.append(found)
        all_notes.update(found)

    blocks, notes = [], []
    dedication = None
    image_count = 0
    title_seen = False
    prev_y = None

    def current_paragraph():
        return next((x for x in reversed(blocks) if x["type"] == "p"), None)

    for pno, page in enumerate(doc):
        items = sorted(page.get_text("dict")["blocks"], key=lambda b: (round(b["bbox"][1]), b["bbox"][0]))
        page_h = page.rect.height

        notes_on_page = {**all_notes, **page_notes[pno]}

        # Texto e imagens.
        lines = []
        for b in items:
            if b["type"] == 1:
                lines.append(("img", b))
                continue
            for l in b["lines"]:
                if plain(l):
                    lines.append(("line", l))
        # Ordena linha a linha (não bloco a bloco): um bloco de texto pode começar acima de uma imagem e acabar abaixo.
        lines.sort(key=lambda kv: (round(kv[1]["bbox"][1]), kv[1]["bbox"][0]))

        # Teatro: junta a etiqueta "Rainha:" com a fala que está na mesma altura.
        merged = []
        for kind, x in lines:
            if (kind == "line" and merged and merged[-1][0] == "line"
                    and abs(merged[-1][1]["bbox"][1] - x["bbox"][1]) < 3
                    and abs(line_size(x) - body) <= 1 and abs(line_size(merged[-1][1]) - body) <= 1):
                a = merged[-1][1]
                space = [{**a["spans"][-1], "text": " ", "flags": 0}] if x["bbox"][0] - a["bbox"][2] > 1.5 else []
                merged[-1] = ("line", {"bbox": a["bbox"], "spans": a["spans"] + space + x["spans"]})
            else:
                merged.append((kind, x))

        prev_y = None
        for kind, x in merged:
            if kind == "img":
                image_count += 1
                img = Image.open(io.BytesIO(x["image"])).convert("RGB")
                small = img.width < SMALL_IMAGE
                if img.width > MAX_WIDTH:
                    img = img.resize((MAX_WIDTH, round(img.height * MAX_WIDTH / img.width)), Image.LANCZOS)
                name = f"{image_count:02d}.jpg"
                img.save(out_dir / name, "JPEG", quality=82, optimize=True, progressive=True)
                block = {"type": "img", "src": f"assets/books/{slug}/{name}", "ratio": round(img.width / img.height, 3)}
                if small:
                    block["small"] = True
                blocks.append(block)
                prev_y = None
                continue

            l = x
            t = plain(l)
            size = line_size(l)
            y = l["bbox"][1]

            if size < body - 1:
                # Texto pequeno: dedicatória no topo da 1.ª página; notas e rodapés já tratados.
                if pno == 0 and y < 70 and not FOOTER.search(t) and dedication is None:
                    dedication = t
                continue
            if size > body + 2:
                if not title_seen:
                    title_seen = True
                    title = title or t
                    # Nota no próprio título: fica só no glossário.
                    for sp in l["spans"]:
                        if sp["flags"] & 1 and sp["text"].strip().isdigit() and int(sp["text"]) in notes_on_page:
                            notes.append({"n": len(notes) + 1, "word": title, "text": notes_on_page[int(sp["text"])], "titleNote": True})
                    continue
            if FOOTER.search(t):
                continue

            line_x = round(l["bbox"][0])
            para = current_paragraph()
            fragment = to_html(l, body, notes_on_page, notes, last_word(lambda: para["html"] if para else ""))

            if script:
                # Teatro: "Rainha: …" abre uma fala; linhas na coluna das falas continuam-na;
                # indicações de cena continuam se estiverem coladas à linha anterior.
                speaker = SPEAKER.match(t)
                close = prev_y is not None and y - prev_y < body * 2.0
                if speaker:
                    who = speaker.group(1)
                    rest = re.sub(r"^\s*" + re.escape(html.escape(who, quote=False)) + r":\s*", "", fragment)
                    blocks.append({"type": "p", "html": rest, "speaker": who})
                elif para and "speaker" in para and abs(line_x - sx) < 6:
                    para["html"] = join(para["html"], fragment)
                elif para and "speaker" not in para and close:
                    para["html"] = join(para["html"], fragment)
                elif para and close and t[:1].islower():
                    para["html"] = join(para["html"], fragment)   # fala que continua na margem
                else:
                    blocks.append({"type": "p", "html": fragment})
                prev_y = y
                continue

            # Legendas: linhas curtas centradas (por baixo/cima de uma imagem).
            mid = (l["bbox"][0] + l["bbox"][2]) / 2
            if abs(mid - page.rect.width / 2) < 20 and l["bbox"][2] - l["bbox"][0] < page.rect.width * 0.45 and line_x > margin + 60:
                blocks.append({"type": "p", "html": fragment, "center": True})
                prev_y = y
                continue

            ended = bool(para) and re.search(r"[.!?…:”»\"']\s*$", re.sub(r"<[^>]+>", "", para["html"]))
            if para and para.get("center"):
                new = True
            elif line_x > margin + 70:
                new = ended          # texto a contornar uma imagem: só é parágrafo novo se o anterior acabou
            else:
                new = line_x > margin + 15
            if para and not new:
                para["html"] = join(para["html"], fragment)
            else:
                blocks.append({"type": "p", "html": fragment})
            prev_y = y

    book = {"slug": slug, "title": title, "dedication": dedication, "blocks": blocks, "notes": notes}
    js = "window.BOOK = " + json.dumps(book, ensure_ascii=False, indent=1) + ";\n"
    (ROOT / "assets" / "books" / f"{slug}.js").write_text(js, encoding="utf-8")

    paragraphs = sum(b["type"] == "p" for b in blocks)
    markers = sum(len(re.findall(r'class="fn"', b.get("html", ""))) for b in blocks) + sum("titleNote" in n for n in notes)
    print(f"{slug}: {paragraphs} parágrafos, {image_count} imagens, {len(notes)} notas"
          f"{', teatro' if script else ''}{', dedicatória: ' + dedication if dedication else ''}"
          f"{'' if markers == len(notes) else f' (!! {markers} marcas)'}")


def join(text, fragment):
    plain_end = re.sub(r"<[^>]+>$", "", text)
    if plain_end.endswith("-") and re.match(r"^(<em>)?[a-zà-ÿ]", fragment):
        return text + fragment        # palavra com hífen partida na mudança de linha
    return f"{text} {fragment}" if text else fragment


if __name__ == "__main__":
    main(*sys.argv[1:4])
