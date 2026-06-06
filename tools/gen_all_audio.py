#!/usr/bin/env python3
"""
Generate bundled MP3 audio (Hebrew + Russian) for every flash-card deck.

Reads WORDS arrays out of:
    hebrew-zero.html         -> audio/words/W{NN}-ru.mp3        (HE already exists)
                                audio/letters/L{NN}-ru.mp3
    hebrew-everyday.html     -> audio/everyday/{NNN}.mp3        (HE)
                                audio/everyday/{NNN}-ru.mp3     (RU)
    hebrew-{block}.html      -> audio/{block}/{NNN}.mp3 + -ru   (for the 5 A2 blocks)

Hebrew is rendered with espeak-ng + mbrola hb2 (female voice). Russian uses
espeak-ng's built-in 'ru' voice. Niqqud is stripped on input. ffmpeg encodes
to 48 kbps mono mp3.

Skips files that already exist with non-trivial size, so the script is safe
to re-run.
"""
from __future__ import annotations
import json, os, re, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NIQQUD = re.compile(r"[֑-ׇ]")

def strip_niqqud(s: str) -> str:
    return NIQQUD.sub("", s)

def render(text: str, lang: str, out_mp3: str) -> bool:
    """Render text to out_mp3 with the right voice. Returns True on success."""
    if os.path.exists(out_mp3) and os.path.getsize(out_mp3) > 500:
        return True
    if not text or not text.strip():
        return False
    os.makedirs(os.path.dirname(out_mp3), exist_ok=True)
    if lang == "he":
        voice, wpm = "mb-hb2", 130
        clean = strip_niqqud(text)
    else:  # ru
        voice, wpm = "ru", 150
        clean = text
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tf:
        wav = tf.name
    try:
        r = subprocess.run(
            ["espeak-ng", "-v", voice, "-s", str(wpm), "-w", wav, clean],
            capture_output=True,
        )
        if r.returncode != 0 or os.path.getsize(wav) < 100:
            return False
        subprocess.run(
            ["ffmpeg", "-y", "-i", wav, "-ac", "1", "-ar", "22050",
             "-b:a", "48k", out_mp3],
            check=True, capture_output=True,
        )
        return True
    finally:
        try: os.unlink(wav)
        except FileNotFoundError: pass

def extract_words(html_path: str):
    """Return the WORDS array from an HTML file as Python list."""
    c = open(html_path, encoding="utf-8").read()
    return _extract_array(c, "WORDS")

def extract_letters(html_path: str):
    c = open(html_path, encoding="utf-8").read()
    return _extract_array(c, "LETTERS")

def _extract_array(c: str, name: str):
    """Find `const NAME = [...];` matching brackets manually."""
    m = re.search(rf"const {name}\s*=\s*\[", c)
    if not m: return []
    start = m.end() - 1  # position of [
    depth = 0; i = start
    while i < len(c):
        ch = c[i]
        if ch == "[": depth += 1
        elif ch == "]":
            depth -= 1
            if depth == 0:
                raw = c[start:i+1]
                # Tolerate JS trailing commas
                raw = re.sub(r",(\s*\])", r"\1", raw)
                return json.loads(raw)
        i += 1
    return []

def gen_for_deck(name: str, items, he_field: int, ru_field: int,
                 he_dir: str, ru_dir: str | None, prefix: str = "",
                 padding: int = 3, ru_suffix: str = "-ru"):
    """Generate HE and RU MP3s for all items of a deck."""
    if ru_dir is None: ru_dir = he_dir
    ok_he = ok_ru = fail = 0
    for i, it in enumerate(items, start=1):
        idx = f"{prefix}{str(i).zfill(padding)}"
        he_text = it[he_field]
        ru_text = it[ru_field]
        he_path = os.path.join(ROOT, he_dir, f"{idx}.mp3")
        ru_path = os.path.join(ROOT, ru_dir, f"{idx}{ru_suffix}.mp3")
        if render(he_text, "he", he_path): ok_he += 1
        else: fail += 1
        if render(ru_text, "ru", ru_path): ok_ru += 1
        else: fail += 1
    print(f"  {name}: HE {ok_he}, RU {ok_ru}, failed {fail}")

def main():
    # 1) hebrew-zero — Hebrew already exists, generate Russian
    zero = os.path.join(ROOT, "hebrew-zero.html")
    if os.path.exists(zero):
        # WORDS: [he, translit, ru]; LETTERS: [glyph, translit, hint, he_name]
        words = extract_words(zero)
        letters = extract_letters(zero)
        print(f"hebrew-zero: {len(words)} words + {len(letters)} letters")
        # Words: existing HE files at audio/words/W01.mp3 stay. Add RU at W01-ru.mp3.
        for i, w in enumerate(words, start=1):
            idx = f"W{str(i).zfill(2)}"
            ru_path = os.path.join(ROOT, "audio/words", f"{idx}-ru.mp3")
            render(w[2], "ru", ru_path)
        # Letters: existing HE files at audio/letters/Lxx.mp3 stay. Add RU = letter name (transliteration).
        for i, l in enumerate(letters, start=1):
            idx = f"L{str(i).zfill(2)}"
            ru_path = os.path.join(ROOT, "audio/letters", f"{idx}-ru.mp3")
            # Speak the Russian transliteration so user knows the name of the letter
            render(l[1], "ru", ru_path)
        print(f"  hebrew-zero RU generated")

    # 2) hebrew-everyday — generate both
    everyday = os.path.join(ROOT, "hebrew-everyday.html")
    if os.path.exists(everyday):
        words = extract_words(everyday)
        print(f"hebrew-everyday: {len(words)} words")
        gen_for_deck("everyday", words, he_field=0, ru_field=2,
                     he_dir="audio/everyday", ru_dir="audio/everyday")

    # 3) Five A2 blocks
    for block_id in ("health", "shopping", "home", "city", "people"):
        path = os.path.join(ROOT, f"hebrew-{block_id}.html")
        if not os.path.exists(path):
            continue
        words = extract_words(path)
        print(f"hebrew-{block_id}: {len(words)} words")
        gen_for_deck(block_id, words, he_field=0, ru_field=2,
                     he_dir=f"audio/{block_id}", ru_dir=f"audio/{block_id}")

if __name__ == "__main__":
    for cmd in ("espeak-ng", "ffmpeg"):
        if not __import__("shutil").which(cmd):
            print(f"missing: {cmd}", file=sys.stderr); sys.exit(1)
    main()
