#!/usr/bin/env python3
"""Validate content/decks/*.json (or the files given as arguments). Exit 1 on errors."""
import json, re, sys, glob, os, unicodedata
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NIQ = re.compile(r"[֑-ׇ]"); HEB = re.compile(r"[א-ת]"); CYR = re.compile(r"[а-яёА-ЯЁ]")
files = sys.argv[1:] or sorted(glob.glob(os.path.join(ROOT, "content/decks/*.json")))
errs = warns = 0
def E(m):
    global errs; errs += 1; print("ERROR", m)
def W(m):
    global warns; warns += 1
    if warns <= 40: print("warn ", m)
skel = lambda s: re.sub(r"[וי\s\-־'\"״׳?!.,]", "", NIQ.sub("", s))
for f in files:
    try: d = json.load(open(f, encoding="utf-8"))
    except Exception as ex: E(f"{f}: bad JSON {ex}"); continue
    name = os.path.basename(f)
    for k in ("id", "title", "level", "cats"):
        if k not in d: E(f"{name}: missing '{k}'")
    if d.get("id") + ".json" != name: E(f"{name}: id mismatch")
    seen = {}; n = 0
    for ci, c in enumerate(d.get("cats", [])):
        if not c.get("id") or not c.get("title"): E(f"{name} cat#{ci}: needs id+title")
        if not c.get("items"): E(f"{name} {c.get('id')}: empty"); continue
        for it in c["items"]:
            n += 1; tag = f"{name}/{c.get('id')}/{it.get('ru','?')[:25]}"
            for k in ("he", "tr", "ru"):
                if not isinstance(it.get(k), str) or not it[k].strip(): E(f"{tag}: missing {k}")
            he = it.get("he", "")
            if NIQ.search(he): E(f"{tag}: 'he' must be unpointed")
            if he and not HEB.search(he): E(f"{tag}: 'he' has no Hebrew letters")
            if CYR.search(he): E(f"{tag}: Cyrillic in he")
            if HEB.search(it.get("tr", "")) or HEB.search(it.get("ru", "")): E(f"{tag}: Hebrew in tr/ru")
            if "nq" in it:
                if not NIQ.search(it["nq"]): W(f"{tag}: nq has no niqqud")
                if skel(it["nq"]) != skel(he): W(f"{tag}: nq/he differ: {it['nq']} vs {he}")
            if he in seen and seen[he] != it.get("ru"): W(f"{tag}: duplicate he within deck ({seen[he]})")
            seen[he] = it.get("ru")
            extra = set(it) - {"he", "nq", "tr", "ru", "em", "g", "note", "pl"}
            if extra: E(f"{tag}: unknown keys {extra}")
    print(f"ok    {name}: {len(d.get('cats', []))} cats, {n} items")
print(f"\n{errs} errors, {warns} warnings"); sys.exit(1 if errs else 0)
