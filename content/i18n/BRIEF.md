# Brief: trilingual fields for the everyday decks

The app teaches Hebrew to Russian speakers. It is becoming trilingual: the interface can be
Russian, English or Hebrew, and the learner can study Hebrew, Russian or English. Every item
therefore needs an English translation and a learnable Russian form.

## Input
`content/i18n/src/<deck>.json` — `{deck, title, cats:[{id,title}], items:[{id, cat, he, nq, tr, ru, note}]}`.
`he` = Hebrew (unpointed), `nq` = pointed Hebrew, `tr` = Hebrew in Russian letters, `ru` = Russian
gloss written for a Russian speaker learning Hebrew (may contain (м)/(ж), slashes, explanations).

## Output
`content/i18n/<deck>.json` (valid JSON, UTF-8, `ensure_ascii=False`):

```json
{
  "_deck": {"en": "Family, guests, holidays", "he": "משפחה, אורחים וחגים"},
  "_cats": {"relatives": {"en": "Relatives", "he": "קרובי משפחה"}},
  "<item id>": {"en": "...", "ra": "...", "rh": "..."}
}
```

Every item id from the source must be present.

### `en` — English
- Natural, idiomatic modern English for the meaning of the Hebrew (use `ru` as a guide, the Hebrew is the source of truth).
- How a native speaker would say it in the same situation, not a word-for-word calque. Phrases stay phrases, questions keep `?`.
- No gender markers, no explanations in brackets. If the Hebrew is ambiguous, translate the sense the deck/category intends.
- Nouns without articles unless the article is part of the expression ("bread", "the bill, please").
- Keep it short — it is shown on a flashcard and as a multiple-choice option.

### `ra` — Russian as it should be learned (by a Hebrew or English speaker)
- The Russian text a learner should memorise for this item, derived from `ru`.
- Put the stress mark U+0301 (combining acute) right after the stressed vowel of every word with 2+ syllables. No mark on ё (always stressed) or on one-syllable words.
- Remove explanations, brackets, gender markers "(м)/(ж)", glosses like "букв." and grammar notes.
- If `ru` gives alternatives "a / b", keep the most common one only. If `ru` is a description rather than a Russian equivalent, write the natural Russian equivalent instead.
- For gendered first-person phrases write the form matching the gender in `ru` ("я уста́л" for (м), "я уста́ла" for (ж)).
- Correct Russian spelling, ё where it belongs.

### `rh` — pronunciation of `ra` for a Hebrew speaker, in Hebrew letters
- How an Israeli would write the Russian sound in Hebrew letters, unpointed, with ו/י as vowel letters and א for a word-initial or standalone vowel; ג׳ for дж, צ׳ for ч, ז׳ for ж, ש for ш, שצ׳ for щ, ח for х, צ for ц, ו for в, ב for б.
- Write what is heard, including vowel reduction in unstressed syllables (молоко́ → מלאקו, хорошо́ → חאראשו, спаси́бо → ספסיבה). Spaces between words like in `ra`.
- Readable at a glance — no niqqud, no apostrophes except in ג׳ צ׳ ז׳.

### `_deck` and `_cats`
English and Hebrew titles for the deck and each category, short, natural.

## Rules
- Accuracy over speed. Do not skip items; do not invent new items.
- Validate: `python3 -c "import json;json.load(open('content/i18n/<deck>.json'))"` and check that every source id is present (write a tiny script in your own scratchpad subfolder).
- Touch only your output files. Do not commit. Do not edit `content/decks`, `content/patches` or code.
