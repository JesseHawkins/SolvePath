# Lessons learned

A candid log, updated at the end of every milestone. It's the raw material for the later "build this with me" guide, so it records what worked, the dead ends, the slow bugs, and what a person rebuilding this from scratch should do differently.

---

## Planning (before M0)

**What worked**

- **Checking every version against the real registries** (npm, GitHub releases, Docker Hub via `skopeo`) before writing the plan. Several "obvious" picks turned out to be wrong for November 2026 (see below). Guessing from memory would have baked those mistakes in.
- **Asking the owner a numbered list of questions**, each with a recommendation. Answers came back fast and short ("go with your picks"), and the list became a decisions table in the plan.
- **Writing down the owner's guiding principle** ("prefer mature, well-documented software") and applying it to every later choice.

**Decisions that changed**

- **Performance floor:** the spec said school Chromebooks and old iPads. The owner changed it to "an iPhone 14 Pro must be buttery smooth". That removed a lot of low-end workarounds before they were written. Lesson: confirm the target hardware early, with the owner's real devices.
- **Lint tooling:** I first recommended Biome + TypeScript 7. The owner asked for mature, well-documented tools, so we switched to ESLint + Prettier + TypeScript 6.0.3 (typescript-eslint doesn't support TS 7 yet).
- **Hosting:** first a `/cube/` folder on a shared host, then a subdomain. Browsers isolate storage by _origin_, not path, so a folder on a shared host lets every other page there read the app's data and login token. A subdomain fixes that for free.
- **Leaderboards:** the owner wanted them on by default with no speed floor. To stay privacy-friendly, names are hidden from logged-out visitors.

**Spec corrections found while verifying** (details in PLAN.md Section 1)

- TypeScript 7 is "latest" but incompatible with typescript-eslint.
- Framer Motion is now called `motion`.
- Playwright's fake camera reads only `.y4m`/`.mjpeg`, not MP4.
- PocketBase has no official Docker image, and no native passkeys.
- The taught grip covers the top and bottom centers, so only 4 centers can seed color clustering.

---

## M0: Scaffold

**What worked**

- **Node 24 runs TypeScript files directly** (type stripping). Tool scripts are plain `.ts` files run with `node tools/x.ts`: no build step, no ts-node, no tsx. Rule: only use erasable syntax (no `enum`), and import with the `.ts` extension.
- **Internal packages with no build step:** each `package.json` points `exports` at `src/index.ts`. Vite, Vitest, and `tsc` all follow it. Nothing to rebuild when a package changes.
- **Theme tokens in TypeScript with a contrast unit test.** The tokens are plain data, so a test checks WCAG contrast for every text/background pair in every theme. Tailwind's default palette is turned off, so raw colors can't sneak in.
- **axe accessibility scans in every theme, in e2e.** On its very first run it caught a real bug (next section).
- **Compiling the Guide at build time** (unified/remark) into HTML plus a search index. The browser does no Markdown parsing, raw HTML is stripped, and the anchor check is a simple regex script.
- **A Diagnostics page that runs cubing.js for real** (scramble, solve, verify) and an e2e test for it. It found the worst bug of the milestone within minutes of writing it.

**Bugs that took the longest**

1. **cubing.js's search worker crashed in the production build** with `document is not defined`, then "Module worker instantiation failed". Cause: cubing.js locates its worker file with `import.meta.resolve`, so Vite/Rolldown bundles that file as a normal chunk, not as a worker. Vite's little "preload helper" for lazy imports lived inside the main app bundle, so the worker imported the whole app, which touches `document`.
   - Dead end 1: `build.modulePreload: false` alone. The helper still lived in the main bundle and the worker still imported it.
   - Dead end 2: moving the helper into its own chunk alone. The worker then called the helper with real preload work, which again needs `document`.
   - Fix: **both together.** The helper goes in its own tiny chunk (`build.rolldownOptions.output.codeSplitting.groups`), _and_ `modulePreload: false`, so there's nothing to preload. Documented in `vite.config.ts`, `CLAUDE.md`, and `UPGRADES.md`.
   - Lesson: when a library starts its own workers, smoke-test it in the **production build**, not just the dev server. Dev worked fine.
2. **Light theme failed contrast on every page.** A small inline `<style>` in `index.html` set a dark background to avoid a white flash while loading. Unlayered CSS beats Tailwind's `@layer base` no matter the selector, so the dark background stayed in the light theme. Fix: scope it to `html[data-theme="dark"]`. Found by axe, not by eye.
3. **The dev-server e2e run failed once, then passed.** Vite optimizes dependencies on the first visit and reloads the page partway through. Not a bug, but it looks like one. Run e2e against the production build (which is what CI does).

**Surprises**

- **ESLint 9 is already deprecated on npm** ("no longer supported"). The plan said ESLint 9 because `eslint-plugin-jsx-a11y` doesn't list ESLint 10. We moved to ESLint 10.15.0 with an npm `overrides` entry for that plugin, after checking it uses none of the APIs ESLint 10 removed, and proving its rules still fire on a deliberately bad file.
- **TypeScript 6 changed defaults:** `types` now defaults to an empty list, so every tsconfig names its types (`vite/client`, `node`) explicitly. Being explicit is clearer anyway.
- **typescript-eslint's project service** finds the _nearest_ `tsconfig.json`. Test and build folders with different settings each need their own `tsconfig.json`, and root config files use a `defaultProject`.
- **cubing.js depends on its own copy of three.js (0.170.x).** We'll add our own three.js in M1. cubing's copy only matters if we import `cubing/twisty`, which we don't plan to. Check the bundle in M1.
- **The safety check in the AI tool blocked writing a file whose text contained `docker run --rm`**, reading it as a delete command. Writing that file with the file tool instead of a shell heredoc avoided the confusion.

**Found by the owner after M0 shipped**

- **Admin login always failed on the first real deploy.** The setup asked people to paste a bcrypt hash into `deploy/.env`. Hashes are full of `$` signs, which need careful quoting, and the example file's placeholder hash looked real enough to leave in place. Fix: `.env` now takes a plain letters-and-numbers password (`ADMIN_HOME_PASSWORD`), and the web container hashes it at startup (`deploy/web-entrypoint.sh`). Lesson: any setup step that needs a command run _and_ special quoting will be skipped or get mangled. Make the machine do it. CI tests the real flow (wrong password gets 401, right password gets 200).
- **Real devices passed the cubing.js check:** desktop Brave 138 ms, iPhone 14 Pro 401 ms, Pixel 250 ms (scramble, solve, and verify, including worker startup).

**Do differently next time**

- Start the e2e Diagnostics smoke test for any worker-using library on day one, and run it against `vite build` + `vite preview`.
- Put `html[data-theme=...]` on any pre-load inline CSS from the start.

---

## M1: Cube core and 3D cube

**What worked**

- **Computing moves from 3D geometry instead of typing permutation tables.** Each sticker gets a 3D position and direction; a move rotates the ones in its layers. Only 18 short lines describe all 54 moves (axis, layers, direction), and every one was right the first time. Typed-in tables are where cube programs usually hide their bugs.
- **One composition rule, written down at the top of `state.ts`:** `compose(a, b)` means "do a, then b", and a state is the result of doing moves on a solved cube. Every other function follows it. Mixing up the order is the classic bug here, and having one rule in one place avoided it.
- **Property tests over every kind of move** (fast-check). They caught a wrong assumption in a test within seconds (next section).
- **Learning the mapping to cubing.js instead of typing it in.** cubing.js numbers its pieces differently and doesn't export a facelet layout. We matched each of its corner and edge spots to ours by which face turns move it, then compared full states for 2,000 random sequences. It agreed on every piece and every twist, including our use of Kociemba's twist rule.
- **Using cubing.js where it's strong:** its notation parser (groups, commutators) and its csTimer-style key map (a public function, `cube3x3x3.keyMapping()`). Nothing copied, nothing to keep in sync.
- **A test that checks the Guide's key table against the real key map.** Docs that list keys go stale; this one can't.
- **Screenshots before calling it done.** The tests prove the logic, not the picture. A quick Playwright screenshot script showed the cube, the arrow, and the dimming were all right.

**Surprises**

- **Center labels can't be matched exactly.** When learning the center mapping to cubing.js, two matchings fit, not one. Swapping every center with the opposite one looks exactly the same under every slice and rotation. That's real math, not a bug: center data alone can't tell them apart. The test now expects exactly those two.
- **Slice moves break the usual parity rule.** M swaps four edges and four centers but no corners, so "corner parity equals edge parity" fails until the centers go back home. A property test found this on its first run. Rule: check cube invariants only after turning the centers home.
- **cubing.js's types don't match its runtime.** `Move.innerLayer` is typed `number | null`, but a move without a layer number has `undefined`. Our parser treats both the same.
- **Two copies of three.js after install.** cubing.js asks for `three@0.170`, so npm kept a second copy. An npm `overrides` entry fixes it, but npm kept the old copy because the lockfile already listed it. We had to remove those lockfile entries and reinstall. Then we checked the build's source maps to be sure only one copy ships.
- **react-three-fiber pulls in all of three.js** (about 250 kB gzipped), because it registers every three.js class. It's fine for a page that loads only when opened, but it means "tree-shaking" in the plan was wrong.
- **eslint-plugin-jsx-a11y doesn't treat `role="application"` as interactive,** even though that's the ARIA role for a custom widget that handles its own keys. Two rules are turned off on that one element, with a comment saying why.
- **The Guide anchor checker only allows lowercase** (`feature.virtual-cube`, not `feature.virtualCube`). The check caught it.

- **A swipe test failed once in CI, on mobile only, and never locally.** The canvas shows up before the 3D scene is ready to find stickers under a finger, so a very early swipe was ignored. Fix: the cube sets `data-ready` once swipes work, and tests wait for it. Lesson: "the element is visible" is not "the element is ready". Give anything that starts up in steps its own ready signal.

**Found by the owner after M1 shipped**

- **Turns looked instant.** The canvas only draws when something changes (to save battery). Each frame's time step is "time since the last frame", so the first frame of a turn after the cube sat still counted the whole idle gap, often seconds, and finished the turn at once. Turns only showed when moves came back to back. Our screenshot check couldn't catch it: the screenshot itself took longer than the turn. Fix: a new turn starts at zero on its first frame, and each frame's step is capped at 50 ms. Checked with a recorded video, cut into a contact sheet with ffmpeg, which showed the layer partway through the turn. Lesson: with on-demand drawing, never trust the first frame's time step. To check an animation, record video; screenshots are too slow.
- **No way to find whole-cube turns with a mouse.** "Swipe in the empty space" worked, but there wasn't much empty space and nothing hinted at it. Added room around the cube, right-drag and Shift-drag anywhere, and clearer help text.
- **x' and z' buttons were missing,** and two-layer moves (r, Rw) had no buttons at all. A plain list of buttons typed by hand is easy to get wrong; the buttons now come in three labeled groups (one layer, two layers, whole cube), and a browser test clicks every whole-cube button.
- **Whole-cube turns need a different arrow.** The owner suggested a curved arrow that wraps around the cube, longer than a face. It's in, and a unit test checks that the arc heads the way the cube turns at every point along it.
- **The highlight for r lit only the R layer.** The highlight now follows the move's layers, not its face letter.
- **The owner asked for a choice of arrow styles** (straight "section" arrows or circles on the turning face), and then narrowed it while the work was underway: circles only for the six outer faces. The faces you can't see were the hard part. A circle on the back face, drawn see-through, lands over the top face from our viewpoint. Making those circles faint helps, but it's the weakest spot in the design. Settings now use Zustand's `persist` middleware instead of hand-written localStorage code.
- **Floating see-through circles for hidden faces didn't look good.** The better answer came from the owner: an **Inspect** mode that spins only the view. Then every circle can lie flat on its own face, and hidden faces also get a straight arrow you can see from the normal view. The view and its arrows live in one three.js group, so spinning the view keeps the arrows on the right face for free. Letters keep meaning the normal view's faces, which matches how notation works: inspecting is looking, not turning the cube in your hands.
- **Half-turn arrows pointed one way and the cube turned the other.** The arrows followed the usual convention (R2 turns like R, clockwise), but the animation turned every half turn counterclockwise, because it used the move's end result (two quarter turns either way look the same once done). Both now get their direction from one value, `moveTurn().signedQuarterTurns`, and a test checks every move in both arrow styles against the animation. Lesson: when two pieces of code each decide the same thing (here, "which way does it turn?"), make one of them ask the other, and test that they agree.
- **Whole-cube turns were hard on a phone** (little empty space to swipe in, nothing for z). We chose two-finger gestures plus a row of buttons inside the view, not visible "zones" on the canvas, which would take room from layer swipes and invite mis-taps. The gesture math is a small pure function with unit tests. The browser test sends real two-finger touches through Chrome's DevTools protocol (`Input.dispatchTouchEvent`), which Playwright's own API can't do. One slip: my own test said a twist was counterclockwise when it was clockwise. The code was right. Lesson: for anything about screen directions, write the expected answer as a picture in words ("like a clock hand going from 9 to 10") before the number.
- **Then the owner simplified it:** whole-cube turns are buttons only, and swipes only turn layers. One clear rule ("swipe = layer, button = whole cube") beat three clever gestures. It also removed a whole class of mistakes, like a layer swipe that drifts off the cube turning into a whole-cube turn. Lesson: when an input is hard to discover, first ask whether it needs to be a gesture at all.

**Do differently next time**

- Write the screenshot script at the start of any visual work, not at the end.
- When adding a library that brings its own copy of a big dependency, check `npm ls <dep>` right away, not after building.

## M2: Vision spike

**What worked**

- **A synthetic camera first.** A small software renderer draws a scrambled cube in a hand, spinning and tipping, with lighting presets and a flipped feed. Every frame comes from a real cube state (Rule 3), so tests always know the right answer. It turned "does vision work?" into fast, repeatable unit tests and found most of the problems below before any real video.
- **Finding the face by its "comb".** Brute-force grid search kept getting stuck: the score drops sharply a few pixels off, so a coarse search lands next to the face, not on it. Adding up color edges by column and by row, then looking for four evenly spaced lines, finds the face fast and almost always on the first try. Search then nudges it into place. Face finding went from 17 ms to 4 ms.
- **Reading the most likely real cube, piece by piece,** instead of reading stickers and then repairing mistakes. Corners and edges are matched to their spots with the Hungarian algorithm, using how well every sticker fits. Every color then has exactly 9 stickers for free, hidden stickers (under fingers) are filled in by the cube's rules, and one misread sticker gets fixed without a special step.
- **A fake webcam in the browser test.** Chrome can play a .y4m video as its camera. We render a synthetic scan to .y4m once (cached), so the browser test runs the whole real path: camera, frame pump, worker, scan, and checks the exact cube.

**Surprises**

- **A face's score can't tell "held" from "mid-spin".** Some frames 15 to 45 degrees into a turn scored as high as held faces: a square grid finds a good-looking patch across two faces. Steadiness over several frames is what tells them apart. Our first test of this was unfair, too: turns ease in and out, so their first and last frames really are face-on.
- **A finger can hide more than a center.** When the top is tipped toward the camera, the finger also covers the edge sticker next to the center. Piece-by-piece reading handles it.
- **The mirror-image risk is about the flip setting, not the spin.** The plan said only the spin direction could tell a new-color cube from its mirror image. In fact, with the right flip setting there's only one answer, because the top and bottom can only be turned, never mirrored. With the wrong setting, every face is mirrored and the mirror-image cube fits perfectly. With known colors (the standard set or a saved profile), the mirror image has impossible centers, so the app can work out the flip by itself. Calibration only matters for brand-new color sets.
- **Real ambiguity exists.** If three hidden stickers sit on edges that all show the same visible color, those edges can be cycled into a different real cube that matches everything seen. A property test found it. Real grips hide at most two edge stickers, and that case always has one answer.
- **Brightening dark pictures broke other ones at first.** Brightening every frame on its own made the same color look different from face to face, which hurt color grouping. Brightening only dark pictures, and changing it slowly, fixed both. Real phone cameras also change exposure between faces, so watch for this in real clips.
- **Our own renderer was the slow part** (272 ms per frame, mostly the blurry background). Drawing the background once per scan made it 30 ms.
- **Tooling:** the vision package has no Node types (it runs in a worker), so the accuracy report lives in its own folder with its own tsconfig. Node can't run our packages directly (imports have no file extensions), so scripts that need them run under Vitest or Playwright, which can.

**Do differently next time**

- Write the fair test first. Twice a "failing" test was really a wrong expectation (mid-spin frames that were face-on, hidden stickers that were truly ambiguous). Ask "what would a perfect answer be here?" before blaming the code.
