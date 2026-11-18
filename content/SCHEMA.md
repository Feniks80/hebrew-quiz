# Content schema (content/decks/<id>.json)

```json
{ "id": "family", "title": "Семья и праздники", "level": "A2",
  "cats": [ { "id": "relatives", "title": "Родственники",
      "items": [ { "he": "סבתא", "nq": "סָבְתָא", "tr": "са́вта", "ru": "бабушка", "em": "👵", "g": "f" } ] } ] }
```
Rules for every item:
- `he` — modern Israeli spelling WITHOUT niqqud (ktiv male, as written in everyday life). Required.
- `nq` — the same word/phrase fully pointed with niqqud. Required for all NEW content.
- `tr` — Russian-letter transliteration of the real modern Israeli pronunciation, with the stressed
  vowel marked by a combining acute (U+0301) right after it: `са́вта`, `бевакаша́`. Use `х` for ח/כ,
  Latin `h` for a pronounced ה (`hаи́р`), `ц` for צ, apostrophe for a glottal break only when needed.
- `ru` — natural Russian translation, lower-case unless a proper noun; for verbs give the infinitive;
  add `(м)` / `(ж)` when the Hebrew form is gendered.
- `em` — optional: ONE emoji character that depicts the meaning unambiguously. Omit rather than force.
- `g` — optional for nouns: "m" or "f". `pl` — optional plural (unpointed). `note` — optional short Russian usage note.
- No duplicates of words already in content/_all_words.tsv (columns: deck, category, he, ru) unless the task says so.
- Category ids: short latin slugs. 15–40 items per category.
Validate with: `python3 tools/validate_content.py content/decks/<id>.json` (must print 0 errors).
