#!/usr/bin/env python3
"""
Generate MP3 fallback audio for hebrew-zero.html.

Requirements (Linux): espeak-ng, mbrola, mbrola-hb2 voice, ffmpeg.
    apt install espeak-ng ffmpeg mbrola mbrola-hb2

Outputs:
    audio/words/W01.mp3 .. W50.mp3
    audio/letters/L01.mp3 .. L22.mp3

Numbering matches the order of WORDS and LETTERS arrays in hebrew-zero.html.
The HTML prefers the native Web Speech API and only falls back to these MP3s
when no Hebrew voice is installed on the device.
"""
from __future__ import annotations
import os, re, subprocess, sys, shutil, tempfile

# (hebrew_with_niqqud_for_display, used_for_TTS_without_niqqud)
# For letters we want the NAME of the letter spoken, not the glyph itself.
WORDS = [
    "שָׁלוֹם", "בֹּקֶר טוֹב", "עֶרֶב טוֹב", "לַיְלָה טוֹב", "תּוֹדָה",
    "בְּבַקָּשָׁה", "סְלִיחָה", "לְהִתְרָאוֹת", "כֵּן", "לֹא",
    "אֲנִי", "אַתָּה", "אַתְּ", "הוּא", "הִיא", "אֲנַחְנוּ",
    "אַבָּא", "אִמָּא", "בֵּן", "בַּת", "סָבָא", "סָבְתָא",
    "מַיִם", "לֶחֶם", "חָלָב", "בֵּיצָה", "גְּבִינָה", "תַּפּוּחַ",
    "בַּיִת", "רְחוֹב", "שׁוּק", "רוֹפֵא", "בֵּית חוֹלִים",
    "אֶחָד", "שְׁנַיִם", "שָׁלוֹשׁ", "אַרְבַּע", "חָמֵשׁ",
    "שֵׁשׁ", "שֶׁבַע", "שְׁמוֹנֶה", "תֵּשַׁע", "עֶשֶׂר",
    "יוֹם", "לַיְלָה", "הַיּוֹם", "מָחָר", "אֶתְמוֹל",
    "כַּמָּה?", "אֵיפֹה?",
]
assert len(WORDS) == 50

LETTERS = [
    "אָלֶף", "בֵּית", "גִּימֶל", "דָּלֶת", "הֵא", "וָו",
    "זַיִן", "חֵית", "טֵית", "יוֹד", "כַּף", "לָמֶד",
    "מֵם", "נוּן", "סָמֶךְ", "עַיִן", "פֵּא", "צַדִּי",
    "קוֹף", "רֵישׁ", "שִׁין", "תָּו",
]
assert len(LETTERS) == 22

NIQQUD = re.compile(r"[֑-ׇ]")

def strip_niqqud(s: str) -> str:
    return NIQQUD.sub("", s)

def render(text: str, out_mp3: str, voice: str = "mb-hb2", wpm: int = 130) -> None:
    clean = strip_niqqud(text)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tf:
        wav = tf.name
    try:
        subprocess.run(
            ["espeak-ng", "-v", voice, "-s", str(wpm), "-w", wav, clean],
            check=True, capture_output=True,
        )
        subprocess.run(
            ["ffmpeg", "-y", "-i", wav, "-ac", "1", "-ar", "22050",
             "-b:a", "48k", out_mp3],
            check=True, capture_output=True,
        )
    finally:
        if os.path.exists(wav):
            os.unlink(wav)

def main() -> None:
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    words_dir = os.path.join(root, "audio", "words")
    letters_dir = os.path.join(root, "audio", "letters")
    os.makedirs(words_dir, exist_ok=True)
    os.makedirs(letters_dir, exist_ok=True)

    for i, w in enumerate(WORDS, start=1):
        out = os.path.join(words_dir, f"W{i:02d}.mp3")
        render(w, out)
        print(f"W{i:02d}: {w}  ->  {os.path.basename(out)} ({os.path.getsize(out)} B)")

    for i, l in enumerate(LETTERS, start=1):
        out = os.path.join(letters_dir, f"L{i:02d}.mp3")
        render(l, out)
        print(f"L{i:02d}: {l}  ->  {os.path.basename(out)} ({os.path.getsize(out)} B)")

if __name__ == "__main__":
    for cmd in ("espeak-ng", "ffmpeg"):
        if not shutil.which(cmd):
            print(f"missing: {cmd}", file=sys.stderr)
            sys.exit(1)
    main()
