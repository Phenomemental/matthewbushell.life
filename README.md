# matthewbushell.life

The repository behind www.matthewbushell.life.

The site's words are not here. They live on the beach, in `spine:life-work` at
https://beach.happyseaurchin.com. A page is published only once its yes is written in
`function:life-work` 4. Until then the site is a holding page. The plan for the site is on
the beach too, at `spine:life-work` 8. It is not copied here.

## What's here

- `templates/` — the pages, as slots that name addresses in `spine:life-work`. No site words.
  `the-approach.html` is a page outside the page map: the film's page, carried whole to
  `/the-approach/` while the site is up, in no menu and no sitemap. It reads `film:the-approach` live in
  the reader's browser; its plan is on the beach at `film:the-approach` 6.5.
  `universe.html` is carried the same way to `/universe/`: the film page's live sky and moons alone, with no film and
  no dial, every block read whole and walked as deep as it goes (a nested underscore opens as a place's heart).
- `the-approach/` — what the film's page plays, copied beside the page by the generator, in the folders of the working
  piece it was ported from (the Claude artifact 'The Approach: the radio'): `clips/` (Mara's and Tom's own moving
  pictures), `poster/` (each clip's first frame), `nar/` (the narrator: the opening o1 to o9, the story r1 to r8,
  the ending e1 and e2), `voices/` (the kept lives on the radio and the whispers in the static), `fictions/` (the
  ten block films), and the `credits/` faces.
  The generator also writes `manifest.json` there, listing the clips, posters, narration and films present.
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

The film page has its own checks, in `tests/the-approach/`. They play the made page in a headless browser at phone (390 by 844, touch) and desktop (1440 by 900) sizes, read the live beach as the page does, and write nothing to it:

```bash
python3 tools/generate.py --out /tmp/made --root "" --site http://127.0.0.1:8770 --record /tmp/record.json
node tests/the-approach/serve.js /tmp/made 8770 &
node tests/the-approach/film.js  --size phone --shots /tmp/shots   # the whole film, Begin to the credits (about seven minutes)
node tests/the-approach/hands.js --size phone   # the viewer's controls (film:the-approach 6.6)
node tests/the-approach/dial.js  --size phone   # the way in, Signal lost, the dial that turns the universe (6.7)
node tests/the-approach/moons.js --size phone   # the nine moons (6.8)
node tests/the-approach/out.js   --size phone   # the way out: Explore the pscale universe, and after the end (6.72)
node tests/the-approach/begin.js --size phone   # Begin draws you in: the approach, the invitation as it arrives, the sound before the film (6.73)
node tests/the-approach/timing.js --size phone  # the film's own timings, to set one build beside another
```

Each takes `--size desktop` and `--url` (the live page, for instance). They need `playwright-core` and an installed Chrome.
