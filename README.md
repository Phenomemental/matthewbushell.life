# matthewbushell.life

The repository behind www.matthewbushell.life.

The site's words are not here. They live on the beach, in `spine:life-work` at
https://beach.happyseaurchin.com. A page is published only once its yes is written in
`function:life-work` 4. Until then the site is a holding page. The plan for the site is on
the beach too, at `spine:life-work` 8. It is not copied here.

## What's here

- `templates/` — the pages, as slots that name addresses in `spine:life-work`. No site words.
- `assets/` — the look (`site.css`), the page's own moves (`site.js`), the mark, and the reader
  tools copied from Phenomemental/happyseaurchin-beach: `beach.js`, `door.js` (MIT), `door.css`,
  and `tools.js`.
- `tools/generate.py` — the generator. `tools/fill.py` is the slot language it uses.
- `tools/serve.py` — serves a made site the way GitHub Pages does, for a preview.
- `tools/issues.py` — opens an issue, once, when a run holds a page or fails.
- `tools/nonsense.json` — test words in the block's exact shape. Lorem ipsum, never real words.
- `tests/` — the generator's rules on the nonsense words, and the pages in a browser.
- `site/` — what is published, committed by each run for the record. `record/` says which
  yes each published page went up with.
- `.github/workflows/site.yml` — hourly at 17 minutes past, and on Run workflow.

## A private preview

Real words never come into this repository. Keep the words file, the pictures and the preview
outside it:

```bash
python3 tools/generate.py --words ~/life-work/words.json --pictures ~/life-work/pictures --out ~/life-work/preview --preview
```

```bash
python3 tools/serve.py ~/life-work/preview --root ''
```

Then open http://127.0.0.1:8000/. The words file is JSON: either one block, taken as
`spine:life-work` (the shape of `tools/nonsense.json`), or a map of block names to blocks. What it
doesn't hold is read from the beach, so the page map at 7.1 comes from there. `--preview` gives
every page a pretend yes and only reports pins. Add `--offline` to read nothing from the beach.

## A pin line

```bash
python3 tools/generate.py --fingerprint moonstone:Ada 0
```

prints the line to write at `function:life-work` 4.2, with the lines it was taken from.

## Tests

```bash
python3 -m unittest discover -s tests -v
```

```bash
node tests/layout.js
```

The second needs Playwright with Chromium. Neither writes to the beach.
