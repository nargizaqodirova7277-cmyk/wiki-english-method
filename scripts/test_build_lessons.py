"""Regression tests for scripts/build_lessons.py — plain asserts, no pytest.

Run:  python scripts/test_build_lessons.py
Covers the five reported generator defects plus determinism and cross-page
heading hierarchy. Exits non-zero on the first failure.
"""
from __future__ import annotations

import re
import sys
from html.parser import HTMLParser
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_lessons as bl  # noqa: E402

WIKI = bl.WIKI
LESSONS = bl.OUT
checks = 0


def ok(label: str) -> None:
    global checks
    checks += 1
    print(f"  ok  {label}")


def md(text: str) -> str:
    return bl.markdown_to_html(text)[1]


# ---- 1 & 2: nested list keeps one <ol>, indentation is not lost ----
src = "1. First\n   - option a\n   - option b\n2. Second\n   - option c\n"
out = md(src)
assert out.count("<ol>") == 1, f"expected a single <ol>, got {out.count('<ol>')}\n{out}"
assert out.count("<ul>") == 2, f"expected two nested <ul>, got {out.count('<ul>')}\n{out}"
assert re.search(r"<ol>\s*<li>First\s*<ul>", out), f"nested list not inside the first item\n{out}"
assert "<li>Second" in out and out.index("<li>First") < out.index("<li>Second")
# the three top-level items must be 1,2 (two) not 1,1,1
assert len(re.findall(r"<ol>\s*<li>", out)) == 1
ok("nested ordered list renders one <ol> with nested <ul> (no 1/1/1)")

flat = md("- a\n- b\n- c\n")
assert flat == "<ul>\n<li>a</li>\n<li>b</li>\n<li>c</li>\n</ul>", repr(flat)
ok("flat list output shape is unchanged")

# ---- 3: sidebar module list has no manual "01." prefix ----
p = bl.page("Module-3-Artificial-Intelligence", "Artificial Intelligence", "<p>x</p>", [])
nav = re.search(r'<h2 class="nav-card-title">12 ta o‘quv moduli</h2><ol>(.*?)</ol>', p, re.S).group(1)
assert not re.search(r">\s*\d{2}\.\s", nav), f"manual NN. prefix still present:\n{nav[:300]}"
assert nav.count("<li>") == 12
ok("sidebar module list uses <ol> auto-numbering, no hand-written 01.")

# ---- 4: leading '###' subtitle is a paragraph, not a heading ----
doc = "# 03-modul — Test\n\n### A subtitle line\n\n## Real section\n\n### Beginner — A2\n\ntext\n"
title, body, sections = bl.markdown_to_html(doc)
assert '<p class="lesson-subtitle">A subtitle line</p>' in body, body
assert "<h3 id=\"a-subtitle-line\"" not in body
assert '<h2 id="real-section"' in body
assert '<h3 id="beginner-a2"' in body  # a level-3 AFTER a section still gets an id
assert body.index('lesson-subtitle') < body.index('<h2')
ok("leading level-3 subtitle -> <p class=\"lesson-subtitle\">, sections keep their ids")

# ---- 5: right-aligned markdown column -> semantic text-align ----
tbl = md("| Name | Time |\n|---|---:|\n| a | 10 min |\n")
assert '<th style="text-align:right">Time</th>' in tbl, tbl
assert '<td style="text-align:right">10 min</td>' in tbl, tbl
assert '<th>Name</th>' in tbl and 'style' not in tbl.split('<th>Name</th>')[0].rsplit('<th', 1)[-1]
centre = md("| A | B |\n|:---:|:---:|\n| 1 | 2 |\n")
assert centre.count('style="text-align:center"') == 4, centre
ok("right/centre aligned markdown tables emit style=\"text-align:...\"")

# ---- generate into memory-free isolated dir already done by caller; here re-generate + idempotence ----
import tempfile, os  # noqa: E402

with tempfile.TemporaryDirectory() as tmp:
    tmp = Path(tmp)
    stems = [s.stem for s in sorted(WIKI.glob("*.md")) if not s.name.startswith("_")]
    (tmp / "lessons").mkdir()
    for stem in stems:
        t, c, secs = bl.markdown_to_html((WIKI / f"{stem}.md").read_text(encoding="utf-8"))
        (tmp / "lessons" / f"{stem}.html").write_text(bl.page(stem, t, c, secs), encoding="utf-8")
    (tmp / "lessons" / "index.html").write_text(bl.catalogue(), encoding="utf-8")
    first = {f.name: f.read_text(encoding="utf-8") for f in (tmp / "lessons").glob("*.html")}
    # second pass
    for stem in stems:
        t, c, secs = bl.markdown_to_html((WIKI / f"{stem}.md").read_text(encoding="utf-8"))
        (tmp / "lessons" / f"{stem}.html").write_text(bl.page(stem, t, c, secs), encoding="utf-8")
    (tmp / "lessons" / "index.html").write_text(bl.catalogue(), encoding="utf-8")
    second = {f.name: f.read_text(encoding="utf-8") for f in (tmp / "lessons").glob("*.html")}
    assert first == second, "generator is not idempotent"
    ok(f"generator is deterministic across two runs ({len(first)} files)")

    # ---- cross-page: heading hierarchy never skips a level ----
    class Headings(HTMLParser):
        def __init__(self) -> None:
            super().__init__()
            self.levels: list[int] = []

        def handle_starttag(self, tag, attrs):
            m = re.fullmatch(r"h([1-6])", tag)
            if m:
                self.levels.append(int(m.group(1)))

    skips = []
    for name, text in first.items():
        h = Headings()
        h.feed(text)
        prev = 0
        for lvl in h.levels:
            if prev and lvl > prev + 1:
                skips.append(f"{name}: h{prev} -> h{lvl}")
            prev = lvl
    assert not skips, "heading level skips:\n  " + "\n  ".join(skips)
    ok(f"no page skips a heading level (h1->h2->h3) across {len(first)} pages")

    # ---- Module 2 beginner task: the situation list is one <ol> with 3 numbered items ----
    m2_body = bl.markdown_to_html((WIKI / "Module-2-Beginner-Task.md").read_text(encoding="utf-8"))[1]
    assert m2_body.count("<ol>") == 1, f"content has {m2_body.count('<ol>')} <ol> blocks, expected 1\n{m2_body}"
    # 3 nested option lists inside the <ol>, plus 1 flat writing-prompt <ul> in the "Writing" section
    assert m2_body.count("<ul>") == 4, f"content has {m2_body.count('<ul>')} <ul>, expected 4"
    ol_block = re.search(r"<ol>.*?</ol>", m2_body, re.S).group(0)
    assert ol_block.count("<ul>") == 3, f"the numbered list should nest exactly 3 option lists\n{ol_block}"
    top_lis = re.findall(r"<ol>\s*<li>|</ul>\s*</li>\s*<li>", m2_body)
    assert len(top_lis) == 3, f"expected 3 top-level numbered items, found {len(top_lis)}\n{m2_body}"
    for phrase in ("Two developers", "A team member", "The deadline is close"):
        assert phrase in m2_body
    ok("Module-2-Beginner-Task situations render as a single 1/2/3 ordered list")

print(f"\nPASS — {checks} generator checks")
