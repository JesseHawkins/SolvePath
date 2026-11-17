# @solvepath/cube-core

The cube model: notation, moves, orientation, point-of-view transforms, validity checks, and color schemes. The source of truth every other package uses. No DOM.

Status: done in M1. See `docs/milestones/M01.md`.

| File             | What it does                                                                        |
| ---------------- | ----------------------------------------------------------------------------------- |
| `faces.ts`       | The six faces and their 3D directions.                                              |
| `geometry.ts`    | Where each of the 54 stickers sits (Kociemba facelet order), and quarter-turn math. |
| `state.ts`       | A cube state (54 sticker numbers), compose, invert, facelet strings.                |
| `moves.ts`       | All moves, computed from geometry. The 3D turn behind each move.                    |
| `notation.ts`    | Reading and writing moves like `R U R' U'`.                                         |
| `cubie.ts`       | Corners and edges with twists and flips (Kociemba rules).                           |
| `orientation.ts` | The 24 ways to hold a cube.                                                         |
| `validity.ts`    | Finds every problem in a set of 54 sticker colors.                                  |
| `pov.ts`         | Turns a camera image grid into the user's B face.                                   |
| `colors.ts`      | Color schemes and cube profiles.                                                    |

`kpuzzle.test.ts` cross-checks the whole model against cubing.js.
