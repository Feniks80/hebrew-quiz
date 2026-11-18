#!/usr/bin/env python3
"""Build the site data from content/ :  data/*.js, service-worker.js, redirect stubs.

    python3 tools/build.py

Source of truth is content/. Nothing in data/ is edited by hand.
© Shimon Donen, 2026
"""
import glob, hashlib, json, os, re, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
C = lambda *p: os.path.join(ROOT, "content", *p)
OUT = os.path.join(ROOT, "data")
NIQ = re.compile(r"[֑-ׇ]")
os.makedirs(OUT, exist_ok=True)


def load(path, default=None):
    if not os.path.exists(path):
        return default
    return json.load(open(path, encoding="utf-8"))


def emoji(v):
    """Legacy items store OpenMoji codepoints ('1F34E'); new ones store the emoji itself."""
    if not v:
        return 0
    if re.fullmatch(r"[0-9A-Fa-f]{4,5}(-[0-9A-Fa-f]{4,5})*", v):
        return "".join(chr(int(x, 16)) for x in v.split("-"))
    return v


def write_js(name, kind, key, obj):
    body = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
        f.write(f"HQ.reg({json.dumps(kind)},{json.dumps(key)},{body});\n")
    return len(body)


def apply_patches(deck):
    patches = load(C("patches", deck["id"] + ".json"), [])
    if not patches:
        return 0
    idx = {}
    for c in deck["cats"]:
        for it in c["items"]:
            idx.setdefault((it["he"], it["ru"]), []).append((c, it))
    n = 0
    for p in patches:
        for c, it in idx.get((p.get("he"), p.get("ru")), []):
            if p.get("delete"):
                if it in c["items"]:
                    c["items"].remove(it); n += 1
            else:
                for k, v in (p.get("fix") or {}).items():
                    if k in ("he", "nq", "tr", "ru", "em", "g", "note"):
                        it[k] = v
                if "he" in (p.get("fix") or {}):
                    it.setdefault("_old", p["he"])
                    it["he"] = NIQ.sub("", it["he"])
                n += 1
    return n


site = load(C("site.json"))
decks = {}
for f in sorted(glob.glob(C("decks", "*.json"))):
    d = load(f)
    d["_patched"] = apply_patches(d)
    decks[d["id"]] = d

# b2 historically contained the five A2 topic decks; keep only what is not taught there.
if "b2" in decks:
    taught = set()
    for k in ("health", "shopping", "home", "city", "people"):
        for c in decks.get(k, {"cats": []})["cats"]:
            taught.update(it["he"] for it in c["items"])
    for c in decks["b2"]["cats"]:
        c["items"] = [it for it in c["items"] if it["he"] not in taught]

manifest = {"decks": {}, "sections": site["sections"], "built": time.strftime("%Y-%m-%d")}
total = 0
for did, d in decks.items():
    used, cats, olds = set(), [], {}
    for c in d["cats"]:
        seen, items = set(), []
        for it in c["items"]:
            k = (it["he"], it.get("nq") or it["ru"])
            if k in seen:
                continue
            seen.add(k)
            h = hashlib.md5((it["he"] + "|" + it["ru"]).encode()).hexdigest()[:6]
            while h in used:
                h = hashlib.md5((h + "x").encode()).hexdigest()[:6]
            used.add(h)
            items.append([h, it["he"], it.get("nq") or 0, it["tr"], it["ru"], emoji(it.get("em")),
                          it.get("g") or 0, it.get("note") or 0])
            if it.get("_old"):
                olds[h] = it["_old"]
        if items:
            cats.append({"id": c["id"], "title": c["title"], "group": c.get("group") or 0, "items": items})
    n = sum(len(c["items"]) for c in cats)
    total += n
    write_js(f"deck-{did}.js", "deck", did, {"id": did, "title": d["title"], "level": d["level"], "cats": cats, "old": olds})
    manifest["decks"][did] = {"title": d["title"], "level": d["level"], "n": n,
                              "cats": [{"id": c["id"], "title": c["title"], "group": c["group"], "n": len(c["items"])} for c in cats]}
    print(f"deck {did:18s} {len(cats):3d} cats {n:5d} items  ({d['_patched']} patched)")

extras = {}
for name, src in (("grammar", "grammar.json"), ("conj", "verbs_conj.json"), ("letters", "letters.json"),
                  ("test-level", "test_level.json"), ("test-idioms", "test_idioms.json"),
                  ("hand", "handwriting.json")):
    obj = load(C(src))
    if obj is None:
        continue
    write_js(f"{name}.js", "extra", name, obj)
    extras[name] = len(obj)
manifest["extras"] = extras
manifest["total"] = total
write_js("manifest.js", "manifest", "manifest", manifest)

# ---- service worker: precache everything the app needs -----------------------------------
files = ["./", "index.html", "app.css", "manifest.json", "store-shim.js"]
files += sorted("js/" + os.path.basename(p) for p in glob.glob(os.path.join(ROOT, "js", "*.js")))
files += sorted("data/" + os.path.basename(p) for p in glob.glob(os.path.join(OUT, "*.js")))
files += sorted("fonts/" + os.path.basename(p) for p in glob.glob(os.path.join(ROOT, "fonts", "*.ttf")))
files += sorted("icons/" + os.path.basename(p) for p in glob.glob(os.path.join(ROOT, "icons", "*.png")))
h = hashlib.md5()
for rel in files[1:]:
    h.update(open(os.path.join(ROOT, rel), "rb").read())
ver = "hq-" + h.hexdigest()[:10]
sw = open(os.path.join(ROOT, "tools", "sw_template.js"), encoding="utf-8").read()
sw = sw.replace("__VERSION__", ver).replace("__FILES__", json.dumps(files, indent=1))
open(os.path.join(ROOT, "service-worker.js"), "w", encoding="utf-8").write(sw)

print(f"\n{total} items in {len(decks)} decks; extras {extras}; cache {ver}; {len(files)} files precached")
