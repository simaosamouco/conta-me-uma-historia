"""Converte o PDF "Consegues acertar?" de uma história num questionário para quiz.html.

Uso:
    python pdf_to_quiz.py questionario.pdf slug

Gera assets/books/<slug>.quiz.js -> window.QUIZ = { slug, questions: [...] }

O PDF não indica as respostas certas: cada pergunta sai com "answer": null
e é preciso preencher à mão o índice da opção certa (0 = A, 1 = B, ...).
"""

import json
import re
import sys
from pathlib import Path

import fitz  # PyMuPDF

ROOT = Path(__file__).resolve().parent.parent
NUMBER = re.compile(r"^\d+/\d+$")
OPTION = re.compile(r"^([A-H])\.\s*(.*)$")


def main(pdf_path, slug):
    lines = []
    for page in fitz.open(pdf_path):
        for line in page.get_text().splitlines():
            line = re.sub(r"\s+", " ", line).strip()
            if line:
                lines.append(line)

    # Dois formatos: com "1/10" antes de cada pergunta, ou só a pergunta (a acabar em "?").
    # Às vezes a opção A vem sem a letra; linhas que começam em minúscula continuam a anterior.
    questions = []
    current = None
    mode = None  # "q" = a ler a pergunta, "opt" = a ler opções

    def start(text=""):
        nonlocal current, mode
        current = {"question": text, "options": [], "answer": None}
        questions.append(current)
        mode = "q"

    for line in lines:
        if NUMBER.match(line):
            start()
            continue
        m = OPTION.match(line)
        if m and current is not None:
            current["options"].append(m.group(2))
            mode = "opt"
        elif current is None or (mode == "opt" and len(current["options"]) >= 2 and not line[:1].islower()):
            start(line)
        elif mode == "q":
            if current["question"].endswith("?"):
                current["options"].append(line)      # opção A sem a letra
                mode = "opt"
            else:
                current["question"] = f"{current['question']} {line}".strip()
        else:
            current["options"][-1] += " " + line

    # Linhas soltas (dicas como "Pensa em quem…") ficam como "perguntas" sem opções.
    questions = [q for q in questions if q["options"]]
    quiz = {"slug": slug, "questions": questions}
    js = "window.QUIZ = " + json.dumps(quiz, ensure_ascii=False, indent=1) + ";\n"
    (ROOT / "assets" / "books" / f"{slug}.quiz.js").write_text(js, encoding="utf-8")
    print(f"{len(questions)} perguntas")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
