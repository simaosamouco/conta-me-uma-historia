"""Gera as versões para descarregar de cada livro: EPUB (leitores de livros) e PDF (A5, para imprimir).

Uso:
    python export_books.py            # todos os livros
    python export_books.py slug ...   # só estes

Lê assets/books/<slug>.js (o mesmo livro do leitor) e os dados de assets/data.js, e gera:
    assets/downloads/<slug>.epub
    assets/downloads/<slug>.pdf
    assets/books/<slug>/cover.jpg     -> capa (primeira ilustração + título), usada no EPUB

A capa e o PDF são desenhados em HTML e "impressos" com o Google Chrome sem janela,
por isso o Chrome tem de estar instalado. Os tipos de letra vêm do Google Fonts (é preciso rede).
"""

import datetime
import html
import json
import re
import shutil
import subprocess
import sys
import tempfile
import uuid
import zipfile
from pathlib import Path
from xml.etree import ElementTree

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
BOOKS = ROOT / "assets" / "books"
OUT = ROOT / "assets" / "downloads"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
FONTS = ("https://fonts.googleapis.com/css2?family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,600;1,7..72,400"
         "&family=Young+Serif&display=block")
PUBLISHER = "Conta-me Uma História"

APPLE = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" class="apple">'
         '<path d="M16 9c-2-2.2-6.5-2.6-9 .4C4.3 12.6 5 19 8 23.6c1.7 2.6 3.8 4.4 6 3.6.9-.3 1.4-.6 2-.6s1.1.3 2 .6c2.2.8 4.3-1 6-3.6 3-4.6 3.7-11 1-14.2C22.5 6.4 18 6.8 16 9Z" fill="#cf4428"/>'
         '<path d="M16 9c0-2.6.8-4.6 2.4-6" stroke="#2b2420" stroke-width="1.8" fill="none" stroke-linecap="round"/>'
         '<path d="M17.4 6.2c1.8-1.9 4.6-2.2 6.6-1.4-1 2-3.6 3.4-6.6 1.4Z" fill="#2f5a45"/></svg>')

esc = lambda s: html.escape(s, quote=True)


# ---------- Dados ----------

def load_js(path):
    text = path.read_text(encoding="utf-8")
    return json.loads(text[text.index("{"):text.rindex("}") + 1])


def load_meta():
    """Título, idades e capa de cada livro, lidos de assets/data.js."""
    source = (ROOT / "assets" / "data.js").read_text(encoding="utf-8")
    meta = {}
    for m in re.finditer(r'\{\s*title:\s*"([^"]+)"(.*?)\}', source, re.S):
        fields = m.group(2)
        book = re.search(r'book:\s*"([^"]+)"', fields)
        if not book:
            continue
        age = re.search(r"age:\s*\[(\d+),\s*(\d+)\]", fields)
        cover = re.search(r'cover:\s*"([^"]+)"', fields)
        meta[book.group(1)] = {
            "title": m.group(1),
            "age": (int(age.group(1)), int(age.group(2))) if age else None,
            "cover": cover.group(1) if cover else None,
        }
    return meta


def age_text(age):
    if not age:
        return ""
    a, b = age
    return f"Para leitores a partir dos {a} anos" if a == b else f"Para leitores dos {a} aos {b} anos"


# ---------- Conteúdo (o mesmo HTML serve para o EPUB e para o PDF) ----------

def story_html(book, note_href):
    """Parágrafos e ilustrações. `note_href(n)` dá o destino de cada nota."""
    out, first = [], True
    for b in book["blocks"]:
        if b["type"] == "img":
            cls = ' class="small"' if b.get("small") else ""
            out.append(f'<figure{cls}><img src="{b["src"].split("/")[-1]}" alt=""/></figure>')
            continue
        text = b.get("html") or esc(b.get("text", ""))
        text = re.sub(r'<sup class="fn" data-n="(\d+)">\d+</sup>',
                      lambda m: f'<sup><a class="fn" id="ref{m[1]}" href="{note_href(m[1])}">{m[1]}</a></sup>',
                      text)
        if b.get("speaker"):
            out.append(f'<p class="speech"><span class="speaker">{esc(b["speaker"])}</span> {text}</p>')
        elif b.get("center"):
            out.append(f'<p class="center">{text}</p>')
        elif first and not re.match(r"^[—–-]", re.sub(r"<[^>]+>", "", text)):
            out.append(f'<p class="first">{text}</p>')
        else:
            out.append(f"<p>{text}</p>")
        first = False
    return "\n".join(out)


def glossary_html(book, back_href):
    items = []
    for n in book.get("notes", []):
        back = "" if n.get("titleNote") else f' <a class="back" href="{back_href(n["n"])}">↩</a>'
        items.append(f'<p class="gloss" id="n{n["n"]}"><span class="num">{n["n"]}</span> '
                     f'<b>{esc(n["word"])}</b> — {esc(n["text"])}{back}</p>')
    return "\n".join(items)


def title_html(book, meta, cover_src):
    picture = f'<img class="cover" src="{cover_src}" alt=""/>' if cover_src else APPLE
    dedication = f'<p class="dedication">{esc(book["dedication"])}</p>' if book.get("dedication") else ""
    return (f'<section class="title-page{"" if cover_src else " no-cover"}">{picture}'
            f'<h1>{esc(book["title"])}</h1><p class="age">{age_text(meta.get("age"))}</p>{dedication}'
            f'<p class="imprint">{PUBLISHER}</p></section>')


END_HTML = f'<section class="end-page"><p class="fim">Fim</p><p class="orn">✦ ✦ ✦</p><p class="imprint">{PUBLISHER}</p></section>'

BOOK_CSS = """
body { font-family: "Literata", Georgia, serif; color: #2b2420; line-height: 1.55; hyphens: auto; -webkit-hyphens: auto; }
h1, h2, .fim, .imprint { font-family: "Young Serif", Georgia, serif; font-weight: normal; }
p { margin: 0; text-indent: 1.4em; text-align: justify; }
p.first, p.center, p.speech, p.gloss { text-indent: 0; }
p.first + p { clear: left; }
p.first::first-letter { font-family: "Young Serif", Georgia, serif; float: left; font-size: 3.6em; line-height: 0.85; padding: 0.05em 0.08em 0 0; color: #cf4428; }
p.center { text-align: center; font-style: italic; color: #6b5f55; margin: 0.4em 0; }
p.speech { margin-top: 0.35em; text-align: left; }
.speaker { font-variant: small-caps; font-weight: 600; letter-spacing: 0.04em; color: #cf4428; margin-right: 0.3em; }
figure { margin: 1.2em 0; text-align: center; }
figure img { width: 100%; height: auto; }
figure.small img { width: 60%; }
a.fn { color: #cf4428; font-weight: 600; text-decoration: none; font-size: 0.8em; }
sup { line-height: 0; }
h2.gloss-title { font-size: 1.8em; margin: 0 0 0.8em; }
p.gloss { text-align: left; margin-bottom: 0.6em; }
p.gloss .num { display: inline-block; min-width: 1.6em; font-weight: 600; color: #cf4428; }
p.gloss a.back { color: #6b5f55; text-decoration: none; }
.title-page, .end-page { text-align: center; }
.title-page img.cover { width: 100%; height: auto; border-radius: 3px; margin-bottom: 2em; }
.title-page svg.apple { width: 3.5em; height: 3.5em; margin: 4em auto 1.5em; display: block; }
.title-page h1 { font-size: 2.4em; line-height: 1.1; margin: 0 0 0.5em; }
.title-page p, .end-page p { text-indent: 0; text-align: center; }
.title-page .age, .title-page .dedication { font-style: italic; color: #6b5f55; }
.title-page .dedication { margin-top: 0.6em; }
.imprint { color: #6b5f55; margin-top: 3em; }
.end-page .fim { font-size: 3em; margin-top: 30%; }
.end-page .orn { color: #cf4428; letter-spacing: 0.5em; }
"""


# ---------- Capa ----------

def cover_page(book, meta, picture):
    """Capa em retrato (1200×1800), desenhada em HTML."""
    text = (f'<div class="text"><h1>{esc(book["title"])}</h1><p class="age">{age_text(meta.get("age"))}</p></div>')
    if picture:
        content = (f'<div class="pic" style="background-image:url(\'{picture}\')"></div>{text}'
                   f'<div class="imprint">{APPLE}{PUBLISHER}</div>')
    else:
        content = f'<div class="card"><div class="mark">{APPLE}</div>{text}<div class="imprint">{PUBLISHER}</div></div>'
    return f"""<!doctype html><html lang="pt-PT"><head><meta charset="utf-8">
<link href="{FONTS}" rel="stylesheet"><style>
html, body {{ margin: 0; width: 1200px; height: 1800px; overflow: hidden; }}
body {{ background: #fbf6ec; color: #2b2420; font-family: "Young Serif", serif; display: flex; flex-direction: column; }}
.pic {{ height: 1120px; background-size: cover; background-position: center; }}
.no-pic {{ background-color: #2f5a45; padding: 90px; box-sizing: border-box; }}
.no-pic .card {{ background: #fbf6ec; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 8px; }}
.mark svg {{ width: 180px; height: 180px; }}
.text {{ flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 0 90px; }}
h1 {{ font-weight: normal; font-size: {120 if len(book["title"]) < 22 else 96}px; line-height: 1.05; margin: 0 0 28px; }}
.age {{ font-family: "Literata", serif; font-style: italic; font-size: 38px; color: #6b5f55; }}
.imprint {{ display: flex; align-items: center; gap: 16px; font-size: 40px; color: #6b5f55; padding-bottom: 80px; justify-content: center; }}
.imprint svg {{ width: 48px; height: 48px; }}
.no-pic .text {{ flex: none; }}
</style></head><body class="{"with-pic" if picture else "no-pic"}">{content}</body></html>"""


def chrome(args, tmp):
    subprocess.run([CHROME, "--headless", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
                    f"--user-data-dir={tmp / 'chrome'}", "--virtual-time-budget=15000", *args],
                   check=True, capture_output=True, timeout=120)


def pick_picture(slug, book, meta):
    """Ilustração para a capa: a primeira grande do livro (as capas do site são miniaturas pequenas).
    Só as histórias ilustradas têm; as do arquivo ficam com a capa só com título."""
    if not meta.get("cover"):
        return None
    big = next((b for b in book["blocks"] if b["type"] == "img" and not b.get("small")), None)
    return BOOKS / slug / big["src"].split("/")[-1] if big else None


def make_cover(slug, book, meta, picture, tmp):
    page = tmp / f"{slug}-cover.html"
    page.write_text(cover_page(book, meta, picture.as_uri() if picture else None), encoding="utf-8")
    png = tmp / f"{slug}-cover.png"
    chrome([f"--screenshot={png}", "--window-size=1200,1800", page.as_uri()], tmp)
    out = BOOKS / slug / "cover.jpg"
    out.parent.mkdir(exist_ok=True)
    Image.open(png).convert("RGB").crop((0, 0, 1200, 1800)).save(out, "JPEG", quality=86, optimize=True)
    return out


# ---------- PDF ----------

PDF_CSS = """
@page { size: 148mm 210mm; margin: 18mm 16mm 20mm;
  @bottom-center { content: counter(page); font-family: "Literata", serif; font-size: 8.5pt; color: #8a7d6e; } }
@page plain { margin: 18mm 16mm 18mm; @bottom-center { content: none; } }
html { font-size: 10.5pt; }
body { margin: 0; background: #fff; }
.title-page, .end-page { page: plain; break-after: page; height: 172mm; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; }
.title-page .imprint { margin-top: auto; }
.title-page.no-cover { justify-content: center; }
.title-page.no-cover .imprint { margin-top: 4em; }
.end-page { break-before: page; break-after: auto; justify-content: center; }
.end-page .fim { margin-top: 0; }
.title-page img.cover { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; }
figure { break-inside: avoid; }
figure img { max-height: 120mm; width: auto; max-width: 100%; border-radius: 2px; }
p { orphans: 2; widows: 2; }
.glossary { break-before: page; }
"""


def make_pdf(slug, book, meta, picture, tmp):
    gloss = glossary_html(book, lambda n: f"#ref{n}")
    doc = f"""<!doctype html><html lang="pt-PT"><head><meta charset="utf-8"><title>{esc(book["title"])}</title>
<meta name="author" content="{PUBLISHER}">
<base href="{(BOOKS / slug).as_uri()}/">
<link href="{FONTS}" rel="stylesheet"><style>{BOOK_CSS}{PDF_CSS}</style></head><body>
{title_html(book, meta, picture.as_uri() if picture else None)}
<main>{story_html(book, lambda n: f"#n{n}")}</main>
{f'<section class="glossary"><h2 class="gloss-title">Palavras novas</h2>{gloss}</section>' if gloss else ""}
{END_HTML}
</body></html>"""
    page = tmp / f"{slug}.html"
    page.write_text(doc, encoding="utf-8")
    out = OUT / f"{slug}.pdf"
    chrome(["--no-pdf-header-footer", f"--print-to-pdf={out}", page.as_uri()], tmp)
    return out


# ---------- EPUB ----------

def xhtml(title, body, epub_ns=False):
    ns = ' xmlns:epub="http://www.idpf.org/2007/ops"' if epub_ns else ""
    return (f'<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html>\n'
            f'<html xmlns="http://www.w3.org/1999/xhtml"{ns} xml:lang="pt-PT" lang="pt-PT">'
            f'<head><meta charset="utf-8"/><title>{esc(title)}</title>'
            f'<link rel="stylesheet" type="text/css" href="style.css"/></head>'
            f'<body>{body}</body></html>')


def make_epub(slug, book, meta, picture, cover):
    notes = book.get("notes", [])
    images = [b["src"].split("/")[-1] for b in book["blocks"] if b["type"] == "img"]

    story = story_html(book, lambda n: f"notes.xhtml#n{n}")
    story = story.replace('<a class="fn"', '<a epub:type="noteref" class="fn"')
    title_page = title_html(book, meta, picture.name if picture else None)

    files = {
        "cover.xhtml": xhtml(book["title"], f'<section epub:type="cover" class="cover-page"><img src="cover.jpg" alt="{esc(book["title"])}" style="width:100%;height:auto"/></section>', True),
        "title.xhtml": xhtml(book["title"], title_page),
        "story.xhtml": xhtml(book["title"], f'<section epub:type="bodymatter chapter">{story}</section>', True),
        "end.xhtml": xhtml("Fim", END_HTML),
    }
    if notes:
        # Cada nota num <aside> para os leitores (Apple Books, Kobo…) a mostrarem numa janelinha.
        gloss = glossary_html(book, lambda n: f"story.xhtml#ref{n}")
        asides = re.sub(r'<p class="gloss" id="(n\d+)">(.*?)</p>',
                        r'<aside epub:type="footnote" id="\1"><p class="gloss">\2</p></aside>', gloss)
        files["notes.xhtml"] = xhtml("Palavras novas", f'<section epub:type="glossary"><h2 class="gloss-title">Palavras novas</h2>{asides}</section>', True)

    spine = ["cover.xhtml", "title.xhtml", "story.xhtml"] + (["notes.xhtml"] if notes else []) + ["end.xhtml"]
    toc = [("title.xhtml", "Página de rosto"), ("story.xhtml", book["title"])]
    if notes:
        toc.append(("notes.xhtml", "Palavras novas"))
    toc.append(("end.xhtml", "Fim"))
    files["nav.xhtml"] = xhtml("Índice",
        '<nav epub:type="toc" id="toc"><h2>Índice</h2><ol>'
        + "".join(f'<li><a href="{h}">{esc(t)}</a></li>' for h, t in toc)
        + '</ol></nav><nav epub:type="landmarks" hidden=""><ol>'
        '<li><a epub:type="cover" href="cover.xhtml">Capa</a></li>'
        '<li><a epub:type="bodymatter" href="story.xhtml">História</a></li></ol></nav>', True)

    # Confirma que todo o XHTML é XML válido antes de empacotar.
    for name, content in files.items():
        ElementTree.fromstring(content.split("\n", 2)[2])

    ident = uuid.uuid5(uuid.NAMESPACE_URL, f"conta-me-uma-historia/{slug}")
    modified = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    manifest = [
        '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
        '<item id="css" href="style.css" media-type="text/css"/>',
        '<item id="cover-image" href="cover.jpg" media-type="image/jpeg" properties="cover-image"/>',
    ]
    manifest += [f'<item id="img{i}" href="{name}" media-type="image/jpeg"/>' for i, name in enumerate(images)]
    svg_pages = set() if picture else {"title.xhtml"}   # sem ilustração, a página de rosto leva a maçã em SVG
    for name in spine:
        props = ' properties="svg"' if name in svg_pages else ""
        manifest.append(f'<item id="{name.split(".")[0]}" href="{name}" media-type="application/xhtml+xml"{props}/>')
    opf = f"""<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid" xml:lang="pt-PT">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">urn:uuid:{ident}</dc:identifier>
    <dc:title>{esc(book["title"])}</dc:title>
    <dc:language>pt-PT</dc:language>
    <dc:creator>{PUBLISHER}</dc:creator>
    <dc:publisher>{PUBLISHER}</dc:publisher>
    <meta property="dcterms:modified">{modified}</meta>
    <meta name="cover" content="cover-image"/>
  </metadata>
  <manifest>
    {chr(10).join("    " + m for m in manifest).strip()}
  </manifest>
  <spine>
    {"".join(f'<itemref idref="{n.split(".")[0]}"/>' for n in spine)}
  </spine>
</package>"""
    container = ('<?xml version="1.0" encoding="utf-8"?>\n'
                 '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">'
                 '<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>')

    out = OUT / f"{slug}.epub"
    with zipfile.ZipFile(out, "w") as z:
        z.writestr(zipfile.ZipInfo("mimetype"), "application/epub+zip", compress_type=zipfile.ZIP_STORED)
        z.writestr("META-INF/container.xml", container, compress_type=zipfile.ZIP_DEFLATED)
        z.writestr("OEBPS/content.opf", opf, compress_type=zipfile.ZIP_DEFLATED)
        z.writestr("OEBPS/style.css", BOOK_CSS, compress_type=zipfile.ZIP_DEFLATED)
        for name, content in files.items():
            z.writestr(f"OEBPS/{name}", content, compress_type=zipfile.ZIP_DEFLATED)
        z.write(cover, "OEBPS/cover.jpg")
        for name in images:
            z.write(BOOKS / slug / name, f"OEBPS/{name}")
    return out


def main(slugs):
    meta = load_meta()
    OUT.mkdir(exist_ok=True)
    slugs = slugs or sorted(meta)
    with tempfile.TemporaryDirectory() as t:
        tmp = Path(t)
        for slug in slugs:
            book = load_js(BOOKS / f"{slug}.js")
            m = meta.get(slug, {})
            picture = pick_picture(slug, book, m)
            cover = make_cover(slug, book, m, picture, tmp)
            epub = make_epub(slug, book, m, picture, cover)
            pdf = make_pdf(slug, book, m, picture, tmp)
            print(f"{slug}: epub {epub.stat().st_size // 1024} KB, pdf {pdf.stat().st_size // 1024} KB")
        shutil.rmtree(tmp / "chrome", ignore_errors=True)


if __name__ == "__main__":
    main(sys.argv[1:])
