from __future__ import annotations

import html
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WIKI = Path(os.environ.get("WIKI_SOURCE", ROOT.parent / "wiki"))
OUT = ROOT / "lessons"

MODULES = [
    ("Importance-of-IT-Skills-in-Software-Engineering", "Importance of IT Skills"),
    ("Module-2-Teamwork", "Teamwork in IT Projects"),
    ("Module-3-Artificial-Intelligence", "Artificial Intelligence"),
    ("Module-4-Software-in-Education", "Software in Education"),
    ("Module-5-Web-App-Development", "Web App Development"),
    ("Module-6-Mobile-Software-Development", "Mobile Software Development"),
    ("Module-7-Software-Error-and-Debugging", "Software Errors and Debugging"),
    ("Module-8-Software-Security", "Software Security"),
    ("Module-9-Project-Management-Tools", "Project Management Tools"),
    ("Module-10-Careers-in-Software-Engineering", "Careers in Software Engineering"),
    ("Module-11-Ethics-for-Developers", "Ethics for Developers"),
    ("Module-12-Software-Engineering-and-Society", "Software Engineering and Society"),
]
MODULE_INDEX = {slug: index for index, (slug, _) in enumerate(MODULES)}


def inline(text: str) -> str:
    placeholders: list[str] = []

    def link(match: re.Match[str]) -> str:
        label, target = match.group(1), match.group(2)
        if not target.startswith(("http://", "https://", "mailto:", "#")):
            target = target.split("#", 1)[0] + ".html"
        token = f"\x00{len(placeholders)}\x00"
        placeholders.append(f'<a href="{html.escape(target, quote=True)}">{html.escape(label)}</a>')
        return token

    text = re.sub(r"\[([^]]+)\]\(([^)]+)\)", link, text)
    text = html.escape(text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"`([^`]+)`", r"<code>\1</code>", text)
    text = re.sub(r"\*(.+?)\*", r"<em>\1</em>", text)
    for index, value in enumerate(placeholders):
        text = text.replace(html.escape(f"\x00{index}\x00"), value)
    return text


def markdown_to_html(markdown: str) -> tuple[str, str, list[tuple[str, str]]]:
    lines = markdown.splitlines()
    title = next((line[2:].strip() for line in lines if line.startswith("# ")), "Dars sahifasi")
    title = re.sub(r"^[0-9]{2}-modul\s*[—-]\s*", "", title)
    sections: list[tuple[str, str]] = []
    output: list[str] = []
    paragraph: list[str] = []
    list_type: str | None = None
    table_rows: list[list[str]] = []
    heading_ids: set[str] = set()

    def flush_paragraph() -> None:
        if paragraph:
            output.append(f"<p>{inline(' '.join(paragraph))}</p>")
            paragraph.clear()

    def flush_list() -> None:
        nonlocal list_type
        if list_type:
            output.append(f"</{list_type}>")
            list_type = None

    def flush_table() -> None:
        if not table_rows:
            return
        rows = table_rows[:]
        table_rows.clear()
        if len(rows) > 1 and all(re.fullmatch(r":?-{3,}:?", cell.replace(" ", "")) for cell in rows[1]):
            rows.pop(1)
        head, *body = rows
        output.append('<div class="table-wrap"><table><thead><tr>')
        output.extend(f"<th>{inline(cell)}</th>" for cell in head)
        output.append("</tr></thead><tbody>")
        for row in body:
            output.append("<tr>" + "".join(f"<td>{inline(cell)}</td>" for cell in row) + "</tr>")
        output.append("</tbody></table></div>")

    def close_blocks() -> None:
        flush_paragraph()
        flush_list()
        flush_table()

    for raw in lines:
        line = raw.strip()
        if line.startswith("|") and line.endswith("|"):
            flush_paragraph(); flush_list()
            table_rows.append([cell.strip() for cell in line.strip("|").split("|")])
            continue
        flush_table()
        heading = re.match(r"^(#{1,4})\s+(.+)$", line)
        if heading:
            close_blocks()
            level = len(heading.group(1))
            text = heading.group(2)
            if level == 1:
                continue
            anchor = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "section"
            base, suffix = anchor, 2
            while anchor in heading_ids:
                anchor = f"{base}-{suffix}"; suffix += 1
            heading_ids.add(anchor)
            if level == 2:
                sections.append((anchor, re.sub(r"[*`]", "", text)))
            output.append(f'<h{level} id="{anchor}">{inline(text)}</h{level}>')
            continue
        if re.fullmatch(r"-{3,}", line):
            close_blocks(); output.append("<hr>"); continue
        item = re.match(r"^[-*]\s+(.+)$", line)
        numbered = re.match(r"^\d+[.)]\s+(.+)$", line)
        if item or numbered:
            flush_paragraph()
            kind = "ul" if item else "ol"
            if list_type != kind:
                flush_list(); output.append(f"<{kind}>"); list_type = kind
            value = (item or numbered).group(1)
            checked = re.match(r"\[([ xX])\]\s*(.*)", value)
            if checked:
                output.append(f'<li class="task-check">{inline(checked.group(2))}</li>')
            else:
                output.append(f"<li>{inline(value)}</li>")
            continue
        if line.startswith("> "):
            close_blocks(); output.append(f"<blockquote>{inline(line[2:])}</blockquote>"); continue
        if not line:
            flush_paragraph(); flush_list(); continue
        paragraph.append(line)
    close_blocks()
    return title, "\n".join(output), sections


def page(slug: str, title: str, content: str, sections: list[tuple[str, str]]) -> str:
    module_pos = MODULE_INDEX.get(slug)
    module_label = f"{module_pos + 1:02d}-modul" if module_pos is not None else "O‘quv resursi"
    prev_link = MODULES[module_pos - 1] if module_pos is not None and module_pos > 0 else None
    next_link = MODULES[module_pos + 1] if module_pos is not None and module_pos < len(MODULES) - 1 else None
    toc = "".join(f'<li><a href="#{anchor}">{html.escape(label)}</a></li>' for anchor, label in sections)
    modules = "".join(
        f'<li><a href="{item_slug}.html"' + (' aria-current="page"' if item_slug == slug else '') + f'>{index:02d}. {html.escape(name)}</a></li>'
        for index, (item_slug, name) in enumerate(MODULES, 1)
    )
    progress = ((module_pos + 1) / len(MODULES) * 100) if module_pos is not None else 100
    prev_html = f'<a class="button" href="{prev_link[0]}.html">← {html.escape(prev_link[1])}</a>' if prev_link else '<span></span>'
    next_html = f'<a class="button next" href="{next_link[0]}.html">{html.escape(next_link[1])} →</a>' if next_link else '<span></span>'
    description = f"Wiki-English Method: {title} darsi, texnik lug‘at va darajali topshiriqlar."
    return f'''<!doctype html>
<html lang="uz">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="{html.escape(description, quote=True)}">
  <meta name="theme-color" content="#f2efe7">
  <link rel="canonical" href="https://nargizaqodirova7277-cmyk.github.io/wiki-english-method/lessons/{slug}.html">
  <link rel="icon" href="../assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="../assets/course.css">
  <title>{html.escape(title)} · Wiki-English Method</title>
</head>
<body>
  <a class="skip-link" href="#lesson-content">Dars matniga o‘tish</a>
  <header class="site-header"><div class="shell header-row">
    <a class="brand" href="../index.html"><span class="brand-mark">W</span><span><span class="brand-name">Wiki-English Method</span><span class="brand-note">Software Engineering uchun kasbiy ingliz tili</span></span></a>
    <nav class="top-nav" aria-label="Asosiy menyu"><a href="../index.html">Bosh sahifa</a><a href="index.html">12 modul</a><a href="Assessment.html">Baholash</a><a href="How-to-Work.html">Yo‘riqnoma</a></nav>
  </div><div class="progress" aria-hidden="true"><span data-reading-progress></span></div></header>
  <main>
    <section class="course-hero"><div class="shell hero-grid">
      <div class="hero-copy"><span class="eyebrow">{module_label}</span><h1>{html.escape(title)}</h1><p class="subtitle">Kasbiy ingliz tili, texnik fikrlash va hamkorlikdagi yozuv bir darsda.</p></div>
      <aside class="hero-meta" aria-label="Dars haqida"><p class="meta-label">Dars pasporti</p><dl class="meta-list"><div><dt>Yo‘nalish</dt><dd>Software Engineering</dd></div><div><dt>Format</dt><dd>O‘rganish · Mashq · Yozish</dd></div><div><dt>Daraja</dt><dd>A2–B2</dd></div></dl></aside>
    </div></section>
    <div class="shell content-grid">
      <article class="lesson" id="lesson-content">{content}<nav class="pager" aria-label="Modullar bo‘yicha navigatsiya">{prev_html}<a class="button button-main" href="index.html">Barcha modullar</a>{next_html}</nav></article>
      <aside class="lesson-nav"><div class="nav-card"><h2 class="nav-card-title">12 ta o‘quv moduli</h2><ol>{modules}</ol></div>{f'<div class="nav-card" style="margin-top:14px"><h2 class="nav-card-title">Shu sahifada</h2><ol>{toc}</ol></div>' if toc else ''}<div class="quick-links"><a class="button" href="How-to-Work.html">Ishlash tartibi</a><a class="button" href="../index.html">Bosh sahifa</a></div></aside>
    </div>
  </main>
  <footer class="site-footer"><div class="shell footer-row"><span>© 2026 Wiki-English Method · FerPI</span><span>Kasbiy ingliz tili laboratoriyasi</span></div></footer>
  <script src="../assets/course.js"></script>
</body>
</html>'''


def catalogue() -> str:
    cards = "".join(
        f'<a class="module-card" href="{slug}.html"><span>{index:02d}</span><strong>{html.escape(title)}</strong><small>Darsni ochish →</small></a>'
        for index, (slug, title) in enumerate(MODULES, 1)
    )
    return f'''<!doctype html><html lang="uz"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Wiki-English Method kursining 12 ta kasbiy ingliz tili moduli."><link rel="icon" href="../assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="../assets/course.css"><title>12 ta modul · Wiki-English Method</title><style>.catalogue{{padding:60px 0 80px}}.catalogue h1{{max-width:820px;margin:0 0 20px;font:400 clamp(48px,7vw,82px)/.98 Georgia,serif;letter-spacing:-.04em}}.catalogue-intro{{max-width:680px;color:var(--muted);font-size:17px}}.module-cards{{display:grid;grid-template-columns:repeat(3,1fr);margin-top:40px;border-top:2px solid var(--ink);border-left:2px solid var(--ink)}}.module-card{{min-height:190px;display:flex;flex-direction:column;padding:22px;border-right:2px solid var(--ink);border-bottom:2px solid var(--ink);background:var(--surface);color:var(--ink);text-decoration:none}}.module-card:nth-child(3n+2){{border-top:7px solid var(--blue)}}.module-card:nth-child(3n+3){{border-top:7px solid var(--burgundy)}}.module-card span{{color:var(--muted);font-size:11px;font-weight:800}}.module-card strong{{margin-top:32px;font:400 24px/1.15 Georgia,serif}}.module-card small{{margin-top:auto;color:var(--green);font-weight:800;text-transform:uppercase}}.module-card:hover{{background:var(--green);color:white}}.module-card:hover span,.module-card:hover small{{color:white}}@media(max-width:850px){{.module-cards{{grid-template-columns:repeat(2,1fr)}}}}@media(max-width:560px){{.module-cards{{grid-template-columns:1fr}}}}</style></head><body><a class="skip-link" href="#modules">Modullarga o‘tish</a><header class="site-header"><div class="shell header-row"><a class="brand" href="../index.html"><span class="brand-mark">W</span><span><span class="brand-name">Wiki-English Method</span><span class="brand-note">Software Engineering uchun kasbiy ingliz tili</span></span></a><nav class="top-nav"><a href="../index.html">Bosh sahifa</a><a href="How-to-Work.html">Yo‘riqnoma</a><a href="Assessment.html">Baholash</a></nav></div></header><main class="shell catalogue" id="modules"><span class="eyebrow">O‘quv dasturi</span><h1>12 ta kasbiy ingliz tili moduli.</h1><p class="catalogue-intro">Har bir modulda texnik lug‘at, o‘qish matni, til qoidasi, uch darajadagi vazifa, Wiki yozuvi va o‘zini baholash mavjud.</p><div class="module-cards">{cards}</div></main><footer class="site-footer"><div class="shell footer-row"><span>© 2026 Wiki-English Method · FerPI</span><span>12 modul · A2–B2</span></div></footer></body></html>'''


def main() -> None:
    OUT.mkdir(exist_ok=True)
    sources = sorted(path for path in WIKI.glob("*.md") if not path.name.startswith("_"))
    for source in sources:
        title, content, sections = markdown_to_html(source.read_text(encoding="utf-8"))
        (OUT / f"{source.stem}.html").write_text(page(source.stem, title, content, sections), encoding="utf-8")
    (OUT / "index.html").write_text(catalogue(), encoding="utf-8")
    print(f"Built {len(sources)} lesson pages and the module catalogue")


if __name__ == "__main__":
    main()
