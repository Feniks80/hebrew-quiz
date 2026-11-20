#!/usr/bin/env python3
"""Pack the whole app into ONE html file that opens by double click, offline.

    python3 tools/build.py && python3 tools/build_single.py   ->  hebrew-quiz.html

Everything (styles, scripts, all decks, fonts, icon) is inlined. © Shimon Donen, 2026
"""
import base64, glob, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = lambda *p: os.path.join(ROOT, *p)
read = lambda p: open(R(p), encoding="utf-8").read()
b64 = lambda p: base64.b64encode(open(R(p), "rb").read()).decode()

css = read("app.css")
def font(m):
    return "url(data:font/ttf;base64," + b64(m.group(1)) + ")"
css = re.sub(r"url\(['\"]?(fonts/[^'\")]+)['\"]?\)", font, css)

js = lambda p: read(p).replace("</script", "<\\/script")
data = [p for p in sorted(glob.glob(R("data", "*.js"))) if not p.endswith("manifest.js")]
parts = [js("store-shim.js"), js("js/core.js"), js("data/manifest.js"), js("js/views.js"), js("js/run.js"), js("js/extra.js")]
parts += [js(os.path.relpath(p, ROOT)) for p in data]

html = f"""<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Учим иврит</title>
<meta name="theme-color" content="#3457d5">
<meta name="format-detection" content="telephone=no">
<meta name="description" content="Иврит для русскоязычных: слова, фразы, грамматика, проверка. © Shimon Donen, 2026">
<link rel="icon" href="data:image/png;base64,{b64('icons/favicon.png')}">
<style>{css}</style>
</head>
<body>
<div id="app"><p style="padding:40px 16px;text-align:center;color:#52607a">Загрузка…</p></div>
<script>{chr(10).join(parts)}
HQ.start();</script>
</body>
</html>
"""
out = R("hebrew-quiz.html")
open(out, "w", encoding="utf-8").write(html)
print(f"{out}: {os.path.getsize(out)/1024/1024:.2f} MB, {len(data)} data files inlined")
