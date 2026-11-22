# Brief: short grammar courses for the trilingual app

The app teaches Hebrew, Russian and English. The interface language is one of the other two.
The existing course `content/grammar.json` (31 lessons, Russian explanations, Hebrew target) shows
the expected depth and tone: short paragraphs, one table, 5–8 examples, 6–8 quiz questions per lesson.
Read 2–3 of its lessons before writing.

## File format — `content/grammar_<target>.json`

```json
{
  "target": "ru",
  "ui": ["he", "en"],
  "lessons": [
    {
      "id": "cases_intro",
      "level": "A1",
      "title": {"he": "...", "en": "..."},
      "text":  {"he": ["paragraph", "..."], "en": ["paragraph", "..."]},
      "table": {"head": {"he": ["..",".."], "en": ["..",".."]}, "rows": [["cell", "cell"]]},
      "examples": [{"t": "target-language sentence", "p": {"he": "pronunciation", "en": "pronunciation"}, "m": {"he": "meaning", "en": "meaning"}}],
      "quiz": [{"q": {"he": "...", "en": "..."}, "opts": ["4 options"], "a": 0, "why": {"he": "...", "en": "..."}}]
    }
  ]
}
```

- Every UI language listed in `ui` must be present in every `title`, `text`, `table.head`, `m`, `q`, `why`.
- `table.rows` cells are target-language forms or short neutral labels shared by both UI languages; if a
  row needs a translated label, use an object `{"he": "...", "en": "..."}` for that cell.
- `opts`: exactly 4 distinct options, usually target-language forms; exactly one is correct, `a` is its index.
  Spread correct answers over all positions. A distractor must not be acceptable in the language.
- `p` (pronunciation) is required only where the brief for your course says so.
- 12 lessons, A1 → A2, ordered from easiest. 6–8 quiz questions per lesson.
- Explanations are written for the learner's native language: point out what differs from it
  (e.g. Hebrew speakers learning Russian: cases, aspect, no "et"; English speakers: gender, cases).
- Keep it simple and friendly; the audience includes adults with no linguistics background.

## Rules
- Correctness first: every statement, form, translation and pronunciation must be right.
- Valid JSON (`python3 -c "import json;json.load(open(...))"`), checked with a small script in your own
  new scratchpad subfolder: languages present, 4 distinct options, `a` in range.
- Write only your own files. Do not commit. Do not edit code or other content.
