from __future__ import annotations

import html
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WIKI = Path(os.environ.get("WIKI_SOURCE", ROOT.parent / "wiki"))
OUT = ROOT / "lessons"

SITE_BASE = "https://nargizaqodirova7277-cmyk.github.io/wiki-english-method/"

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
    # each entry: (indent, tag, has_child_list) — an <li> is always "open" at the top of the stack
    list_stack: list[list] = []
    table_rows: list[list[str]] = []
    heading_ids: set[str] = set()
    seen_section = False  # a level-2 heading has appeared; used to detect the leading subtitle

    def flush_paragraph() -> None:
        if paragraph:
            output.append(f"<p>{inline(' '.join(paragraph))}</p>")
            paragraph.clear()

    def close_open_li() -> None:
        """Close the <li> currently open at the top of the stack."""
        _, _, has_child = list_stack[-1]
        if has_child:
            output.append("</li>")
        else:
            output[-1] = output[-1] + "</li>"

    def flush_list() -> None:
        while list_stack:
            _, tag, _ = list_stack[-1]
            close_open_li()
            output.append(f"</{tag}>")
            list_stack.pop()

    def list_item(indent: int, kind: str, value: str) -> None:
        nonlocal list_stack
        checked = re.match(r"\[([ xX])\]\s*(.*)", value)
        content = f'<li class="task-check">{inline(checked.group(2))}' if checked else f"<li>{inline(value)}"
        # close any lists deeper than this item
        while list_stack and list_stack[-1][0] > indent:
            _, tag, _ = list_stack[-1]
            close_open_li()
            output.append(f"</{tag}>")
            list_stack.pop()
        if list_stack and list_stack[-1][0] == indent:
            if list_stack[-1][1] == kind:
                close_open_li()                       # sibling: close previous <li>
                list_stack[-1][2] = False
                output.append(content)
                return
            # same level, different list type: close it and start a new one as a sibling
            _, tag, _ = list_stack[-1]
            close_open_li()
            output.append(f"</{tag}>")
            list_stack.pop()
        # open a new list (nested inside the current open <li>, or at the root)
        if list_stack:
            list_stack[-1][2] = True                  # the parent <li> now has a child list
        output.append(f"<{kind}>")
        list_stack.append([indent, kind, False])
        output.append(content)

    def flush_table() -> None:
        if not table_rows:
            return
        rows = table_rows[:]
        table_rows.clear()
        aligns: list[str] = []
        if len(rows) > 1 and all(re.fullmatch(r":?-{3,}:?", cell.replace(" ", "")) for cell in rows[1]):
            for cell in rows[1]:
                cell = cell.replace(" ", "")
                if cell.startswith(":") and cell.endswith(":"):
                    aligns.append("center")
                elif cell.endswith(":"):
                    aligns.append("right")
                else:
                    aligns.append("")
            rows.pop(1)

        def style(index: int) -> str:
            align = aligns[index] if index < len(aligns) else ""
            return f' style="text-align:{align}"' if align in ("right", "center") else ""

        head, *body = rows
        output.append('<div class="table-wrap"><table><thead><tr>')
        output.extend(f"<th{style(index)}>{inline(cell)}</th>" for index, cell in enumerate(head))
        output.append("</tr></thead><tbody>")
        for row in body:
            output.append("<tr>" + "".join(f"<td{style(index)}>{inline(cell)}</td>" for index, cell in enumerate(row)) + "</tr>")
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
            if level == 3 and not seen_section:
                # a level-3 heading before any section is the lesson subtitle, not a heading
                output.append(f'<p class="lesson-subtitle">{inline(text)}</p>')
                continue
            anchor = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "section"
            base, suffix = anchor, 2
            while anchor in heading_ids:
                anchor = f"{base}-{suffix}"; suffix += 1
            heading_ids.add(anchor)
            if level == 2:
                seen_section = True
                sections.append((anchor, re.sub(r"[*`]", "", text)))
            output.append(f'<h{level} id="{anchor}">{inline(text)}</h{level}>')
            continue
        if re.fullmatch(r"-{3,}", line):
            close_blocks(); output.append("<hr>"); continue
        bullet = re.match(r"^([-*])\s+(.+)$", raw.lstrip())
        numbered = re.match(r"^\d+[.)]\s+(.+)$", raw.lstrip())
        if bullet or numbered:
            flush_paragraph()
            indent = len(raw) - len(raw.lstrip(" "))
            if bullet:
                list_item(indent, "ul", bullet.group(2))
            else:
                list_item(indent, "ol", numbered.group(1))
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
        f'<li><a href="{item_slug}.html"' + (' aria-current="page"' if item_slug == slug else '') + f'>{html.escape(name)}</a></li>'
        for _, (item_slug, name) in enumerate(MODULES, 1)
    )
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
  <link rel="canonical" href="{SITE_BASE}lessons/{slug}.html">
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
    return f'''<!doctype html><html lang="uz"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Wiki-English Method kursining 12 ta kasbiy ingliz tili moduli."><meta name="theme-color" content="#f2efe7"><meta property="og:title" content="12 ta o‘quv moduli · Wiki-English Method"><meta property="og:description" content="Kasbiy ingliz tili kursining 12 ta moduli: texnik lug‘at, o‘qish, til qoidasi, darajali vazifa, Wiki yozuvi va o‘zini baholash."><meta property="og:type" content="website"><meta property="og:url" content="{SITE_BASE}lessons/"><link rel="canonical" href="{SITE_BASE}lessons/"><link rel="icon" href="../assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="../assets/course.css"><title>12 ta modul · Wiki-English Method</title><style>.catalogue{{padding:60px 0 80px}}.catalogue h1{{max-width:820px;margin:0 0 20px;font:400 clamp(48px,7vw,82px)/.98 Georgia,serif;letter-spacing:-.04em}}.catalogue-intro{{max-width:680px;color:var(--muted);font-size:17px}}.module-cards{{display:grid;grid-template-columns:repeat(3,1fr);margin-top:40px;border-top:2px solid var(--ink);border-left:2px solid var(--ink)}}.module-card{{min-height:190px;display:flex;flex-direction:column;padding:22px;border-right:2px solid var(--ink);border-bottom:2px solid var(--ink);background:var(--surface);color:var(--ink);text-decoration:none}}.module-card:nth-child(3n+2){{border-top:7px solid var(--blue)}}.module-card:nth-child(3n+3){{border-top:7px solid var(--burgundy)}}.module-card span{{color:var(--muted);font-size:11px;font-weight:800}}.module-card strong{{margin-top:32px;font:400 24px/1.15 Georgia,serif}}.module-card small{{margin-top:auto;color:var(--green);font-weight:800;text-transform:uppercase}}.module-card:hover{{background:var(--green);color:white}}.module-card:hover span,.module-card:hover small{{color:white}}@media(max-width:850px){{.module-cards{{grid-template-columns:repeat(2,1fr)}}}}@media(max-width:560px){{.module-cards{{grid-template-columns:1fr}}}}</style></head><body><a class="skip-link" href="#modules">Modullarga o‘tish</a><header class="site-header"><div class="shell header-row"><a class="brand" href="../index.html"><span class="brand-mark">W</span><span><span class="brand-name">Wiki-English Method</span><span class="brand-note">Software Engineering uchun kasbiy ingliz tili</span></span></a><nav class="top-nav"><a href="../index.html">Bosh sahifa</a><a href="How-to-Work.html">Yo‘riqnoma</a><a href="Assessment.html">Baholash</a></nav></div></header><main class="shell catalogue" id="modules"><span class="eyebrow">O‘quv dasturi</span><h1>12 ta kasbiy ingliz tili moduli.</h1><p class="catalogue-intro">Har bir modulda texnik lug‘at, o‘qish matni, til qoidasi, uch darajadagi vazifa, Wiki yozuvi va o‘zini baholash mavjud.</p><div class="module-cards">{cards}</div></main><footer class="site-footer"><div class="shell footer-row"><span>© 2026 Wiki-English Method · FerPI</span><span>12 modul · A2–B2</span></div></footer></body></html>'''


def sitemap(stems: list[str]) -> str:
    locs = [SITE_BASE, SITE_BASE + "lessons/"]
    locs += [f"{SITE_BASE}lessons/{stem}.html" for stem in stems]
    body = "\n".join(f"  <url><loc>{loc}</loc></url>" for loc in locs)
    return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + body + "\n</urlset>\n"


def main() -> None:
    OUT.mkdir(exist_ok=True)
    sources = sorted(path for path in WIKI.glob("*.md") if not path.name.startswith("_"))
    for source in sources:
        title, content, sections = markdown_to_html(source.read_text(encoding="utf-8"))
        (OUT / f"{source.stem}.html").write_text(page(source.stem, title, content, sections), encoding="utf-8")
    (OUT / "index.html").write_text(catalogue(), encoding="utf-8")
    (ROOT / "sitemap.xml").write_text(sitemap([source.stem for source in sources]), encoding="utf-8")
    print(f"Built {len(sources)} lesson pages, the module catalogue and sitemap.xml")


if __name__ == "__main__":
    main()
