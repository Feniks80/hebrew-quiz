#!/usr/bin/env python3
"""Write content/i18n/src/<deck>.json: the built items (after patches) that need
English / Russian-for-learners fields. Translators fill content/i18n/<deck>.json.
    python3 tools/build.py && python3 tools/export_i18n_src.py
"""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DECKS = ["zero", "core", "signs", "everyday", "health", "shopping", "home", "city",
         "people", "family", "offices", "phrases", "verbs"]
for d in DECKS:
    s = open(os.path.join(ROOT, "data", f"deck-{d}.js"), encoding="utf-8").read()
    obj = json.loads(s[s.index("{"):s.rindex("}") + 1])
    out = {"deck": d, "title": obj["title"], "cats": [], "items": []}
    for c in obj["cats"]:
        out["cats"].append({"id": c["id"], "title": c["title"]})
        for a in c["items"]:
            out["items"].append({"id": a[0], "cat": c["id"], "he": a[1], "nq": a[2] or "", "tr": a[3], "ru": a[4], "note": a[7] or ""})
    json.dump(out, open(os.path.join(ROOT, "content", "i18n", "src", f"{d}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(d, len(out["items"]))
