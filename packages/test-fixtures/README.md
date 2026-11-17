# Test fixtures

Real camera clips for the vision accuracy report (`npm run vision:report`).

- `vision/<name>.webm` (or `.mp4`): a grip-and-spin scan. Hands and cube only.
- `vision/<name>.json`: the facts: the scramble done to a solved cube (white on top, green in front), which cube, the lighting, and whether the picture was flipped.

Record with the dev-only fixture recorder (`npm run fixtures:record`, then open the address it prints on your phone), and add clips with `npm run fixtures:add -- <clip> <facts.json>`. The right answer always comes from the scramble, never from labeling stickers by hand.
