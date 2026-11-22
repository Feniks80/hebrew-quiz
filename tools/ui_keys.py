#!/usr/bin/env python3
"""Collect every interface string (HQ.t('...'), HQ.t({..}) values, HQ.n plural forms,
site.json titles, deck titles) into content/i18n/ui_keys.json for translators."""
import glob, json, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
keys, plurals = set(), set()
for f in glob.glob(os.path.join(ROOT, "js", "*.js")):
    s = open(f, encoding="utf-8").read()
    keys.update(re.findall(r"HQ\.t\('((?:[^'\\]|\\.)*)'", s))
    for obj in re.findall(r"HQ\.t\(\{([^}]*)\}", s):
        keys.update(re.findall(r"'((?:[^'\\]|\\.)*)'", obj))
    for m in re.finditer(r"HQ\.n\([^,]+,\s*'([^']*)',\s*'([^']*)',\s*'([^']*)'\)", s):
        plurals.add(m.groups())
site = json.load(open(os.path.join(ROOT, "content", "site.json"), encoding="utf-8"))
for sec in site["sections"]:
    keys.update(v for k, v in sec.items() if k in ("title", "hint") and v)
    for it in sec["items"]:
        keys.update(v for k, v in it.items() if k in ("title", "desc") and v)
for f in glob.glob(os.path.join(ROOT, "content", "decks", "*.json")):
    keys.add(json.load(open(f, encoding="utf-8"))["title"])
keys = sorted(k for k in keys if re.search("[А-Яа-яЁё]", k))
json.dump({"strings": keys, "plurals": sorted(plurals)}, open(os.path.join(ROOT, "content", "i18n", "ui_keys.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(keys), "strings,", len(plurals), "plural sets")
