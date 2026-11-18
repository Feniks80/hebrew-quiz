# Brief for content agents (read fully before working)

Project: Hebrew-learning app for Russian speakers living in Israel. Two learners: an elderly beginner
(needs everyday survival language) and an engineer (B1/B2, construction/precast). UI language is Russian.

- Read `content/SCHEMA.md` (format + rules) and skim `content/_all_words.tsv` (everything that already
  exists: deck, category, he, ru). Do NOT repeat words that already exist there unless your task says so
  (grep it for each candidate: `grep -P "\t<hebrew>\t" content/_all_words.tsv`).
- Quality bar: every Hebrew form must be real, modern, commonly used Israeli Hebrew, spelled correctly
  (ktiv male in `he`, correct full niqqud in `nq`), with correct stress in `tr`. If you are not sure a
  word/phrase is correct and natural — leave it out. Accuracy matters far more than hitting a count.
- Russian translations must be natural and unambiguous. Mark gendered forms: (м)/(ж), plural (мн.).
- Phrases: short, practical, things people really say; give the masculine-speaker form by default and,
  where it matters, add the feminine variant as a separate item marked (ж) — the main learner is a woman,
  so for first-person present-tense phrases ("я хочу", "мне нужно") ALWAYS include the feminine form.
- Write ONLY the files your task names. Do not touch any other file. Do not git commit or push.
- When done run `python3 tools/validate_content.py <your file>` and fix until it prints `0 errors`
  (warnings about nq/he skeleton are acceptable only when the pointed spelling genuinely differs).
- Final report: counts per category + anything you were unsure about. Keep it short.
