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

manifest = {"decks": {}, "sections": site["sections"], "built": time.strftime("%Y-%m-%d"),
            "ver": time.strftime("%Y.%m.%d.%H%M", time.gmtime())}

# trilingual fields: content/i18n/<deck>.json  {"<id>": {"en","ra","rh"}, "_deck": {...}, "_cats": {...}}
I18N = {}
for f in glob.glob(C("i18n", "*.json")):
    I18N[os.path.splitext(os.path.basename(f))[0]] = load(f)
total = 0
for did, d in decks.items():
    used, cats, olds = set(), [], {}
    tr = I18N.get(did, {})
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
            row = [h, it["he"], it.get("nq") or 0, it["tr"], it["ru"], emoji(it.get("em")),
                   it.get("g") or 0, it.get("note") or 0]
            x = tr.get(h)
            if x and x.get("en") and x.get("ra"):
                row += [x["en"], x["ra"], x.get("rh") or 0]
            items.append(row)
            if it.get("_old"):
                olds[h] = it["_old"]
        if items:
            cats.append({"id": c["id"], "title": c["title"], "group": c.get("group") or 0, "items": items})
    n = sum(len(c["items"]) for c in cats)
    total += n
    write_js(f"deck-{did}.js", "deck", did, {"id": did, "title": d["title"], "level": d["level"], "cats": cats, "old": olds})
    nt = sum(1 for c in cats for a in c["items"] if len(a) > 8)
    dt, ct = tr.get("_deck") or {}, tr.get("_cats") or {}
    manifest["decks"][did] = {"title": d["title"], "level": d["level"], "n": n, "nt": nt,
                              "ti": {"en": dt.get("en"), "he": dt.get("he")} if dt else 0,
                              "cats": [{"id": c["id"], "title": c["title"], "group": c["group"], "n": len(c["items"]),
                                        "nt": sum(1 for a in c["items"] if len(a) > 8),
                                        "ti": ct.get(c["id"]) or 0} for c in cats]}
    print(f"deck {did:18s} {len(cats):3d} cats {n:5d} items  ({d['_patched']} patched)")

extras = {}
for name, src in (("grammar", "grammar.json"), ("conj", "verbs_conj.json"), ("letters", "letters.json"),
                  ("test-level", "test_level.json"), ("test-idioms", "test_idioms.json"),
                  ("hand", "handwriting.json"), ("grammar-ru", "grammar_ru.json"), ("grammar-en", "grammar_en.json"),
                  ("grammar-he-en", "grammar_he_en.json"), ("letters-ru", "letters_ru.json"), ("letters-en", "letters_en.json"),
                  ("ui", "i18n/ui.json")):
    obj = load(C(src))
    if obj is None:
        continue
    if name == "conj":                      # extra verb tables live in verbs_conj_add*.json
        known = {v["inf"] for v in obj}
        for f in sorted(glob.glob(C("verbs_conj_add*.json"))):
            for v in load(f) or []:
                if v.get("inf") and v["inf"] not in known:
                    obj.append(v); known.add(v["inf"])
    write_js(f"{name}.js", "extra", name, obj)
    extras[name] = len(obj.get("lessons", obj)) if isinstance(obj, dict) and "lessons" in obj else len(obj)
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
