#!/usr/bin/env python3
"""One-off: extract all legacy vocabulary out of the old HTML pages into content/decks/*.json."""
import json, re, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
NIQ = re.compile(r"[\u0591-\u05C7]")
strip = lambda s: NIQ.sub("", s)

def arr(html, name):
    m = re.search(rf"const {name}\s*=\s*\[", html)
    s = m.end() - 1; d = 0; i = s; instr = False; esc = False
    while i < len(html):
        c = html[i]
        if instr:
            if esc: esc = False
            elif c == "\\": esc = True
            elif c == '"': instr = False
        else:
            if c == '"': instr = True
            elif c == "[": d += 1
            elif c == "]":
                d -= 1
                if d == 0:
                    raw = re.sub(r",(\s*\])", r"\1", html[s:i+1])
                    raw = re.sub(r"^\s*//.*$", "", raw, flags=re.M)
                    return json.loads(raw)
        i += 1

def item(he, tr, ru, em=None):
    it = {"he": strip(he).strip(), "tr": tr.strip(), "ru": ru.strip()}
    if NIQ.search(he): it["nq"] = he.strip()
    if em: it["em"] = em
    return it

def save(deck):
    n = sum(len(c["items"]) for c in deck["cats"])
    json.dump(deck, open(os.path.join(ROOT, "content/decks", deck["id"] + ".json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f'{deck["id"]:10s} {len(deck["cats"]):3d} cats {n:5d} items')

R = lambda f: open(os.path.join(ROOT, f), encoding="utf-8").read()

# zero
h = R("hebrew-zero.html")
save({"id": "zero", "title": "Первые 50 слов", "level": "A0", "cats": [
    {"id": "base", "title": "Первые слова", "items": [item(w[0], w[1], w[2]) for w in arr(h, "WORDS")]}]})
letters = [{"ch": l[0], "name": l[1], "hint": l[2], "nq": l[3]} for l in arr(h, "LETTERS")]
json.dump(letters, open(os.path.join(ROOT, "content/letters.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

# everyday (emoji codepoints live in tools/fetch_emoji.py)
from fetch_emoji import WORDS as EW
cats = {}
for he, tr, ru, cp, cat in EW:
    cats.setdefault(cat, []).append(item(he, tr, ru, cp))
save({"id": "everyday", "title": "100 слов с картинками", "level": "A1",
      "cats": [{"id": f"c{i}", "title": k, "items": v} for i, (k, v) in enumerate(cats.items())]})

# A2 blocks
for b, title in [("health", "Здоровье и врач"), ("shopping", "Магазин и еда"), ("home", "Дом и быт"), ("city", "Город и транспорт"), ("people", "Люди и общение")]:
    cats = {}
    for he, tr, ru, cp, cat in arr(R(f"hebrew-{b}.html"), "WORDS"):
        cats.setdefault(cat, []).append(item(he, tr, ru, cp))
    save({"id": b, "title": title, "level": "A2",
          "cats": [{"id": f"c{i}", "title": k, "items": v} for i, (k, v) in enumerate(cats.items())]})

# B1 / B2 quizzes: Q = [[name, [[ru, he, tr], ...]], ...]; CATS groups them
def quiz(fn, did, title, level):
    h = R(fn); Q = arr(h, "Q")
    cm = re.search(r"const CATS=\[(.*?)\n?\];", h, re.S).group(1)
    groups = {}
    for g, k, a, b in re.findall(r'g:"([^"]+)",k:"([^"]+)",c:"[^"]+",r:\[(\d+),(\d+)\]', cm):
        its = []
        for qi in range(int(a), int(b)):
            its += [item(r[1], r[2], r[0]) for r in Q[qi][1]]
        groups.setdefault(g, []).append({"title": k, "items": its})
    cats = []
    for g, subs in groups.items():
        for s in subs:
            cats.append({"id": f"c{len(cats)}", "group": g, "title": s["title"], "items": s["items"]})
    save({"id": did, "title": title, "level": level, "cats": cats})
quiz("hebrew-engineer.html", "engineer", "Инженерный иврит", "B1")
quiz("hebrew-b2-quiz.html", "b2", "Иврит — бытовой B2", "B2")

# tests
json.dump(arr(R("hebrew-test.html"), "QUESTIONS"), open(os.path.join(ROOT, "content/test_level.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump(arr(R("hebrew-test-idioms.html"), "QUESTIONS"), open(os.path.join(ROOT, "content/test_idioms.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
