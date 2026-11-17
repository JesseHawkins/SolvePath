/**
 * State for one virtual cube.
 *
 * `state` is the truth and changes the moment a move is made. The 3D view
 * catches up by playing `queue` one turn at a time, so fast typing never
 * loses a move and the logic (like "is it solved?") never waits for an
 * animation.
 */
import { createStore, type StoreApi } from "zustand/vanilla";
import {
  applyMove,
  invertMove,
  looksSolved,
  solvedState,
  type CubeState,
  type Move,
} from "@solvepath/cube-core";

export type QueueItem = { kind: "move"; move: Move } | { kind: "set"; state: CubeState };

export interface CubeStoreState {
  state: CubeState;
  /** Every move made since the last reset or scramble, oldest first. */
  history: Move[];
  /** Turns the 3D view still has to show. */
  queue: QueueItem[];
  solved: boolean;
  doMoves: (moves: readonly Move[]) => void;
  /** Jumps straight to a state (no animation) and clears the history. */
  setState: (state: CubeState) => void;
  reset: () => void;
  undo: () => void;
  /** For the 3D view: takes the next turn to show. */
  takeNext: () => QueueItem | undefined;
}

export type CubeStore = StoreApi<CubeStoreState>;

export function createCubeStore(initial: CubeState = solvedState()): CubeStore {
  return createStore<CubeStoreState>()((set, get) => ({
    state: initial,
    history: [],
    queue: [],
    solved: looksSolved(initial),
    doMoves: (moves) => {
      if (moves.length === 0) return;
      let s = get().state;
      for (const m of moves) s = applyMove(s, m);
      set((prev) => ({
        state: s,
        history: [...prev.history, ...moves],
        queue: [...prev.queue, ...moves.map((move) => ({ kind: "move" as const, move }))],
        solved: looksSolved(s),
      }));
    },
    setState: (state) =>
      set({ state, history: [], queue: [{ kind: "set", state }], solved: looksSolved(state) }),
    reset: () => get().setState(solvedState()),
    undo: () => {
      const { history, state } = get();
      const last = history.at(-1);
      if (!last) return;
      const back = invertMove(last);
      const s = applyMove(state, back);
      set((prev) => ({
        state: s,
        history: prev.history.slice(0, -1),
        queue: [...prev.queue, { kind: "move", move: back }],
        solved: looksSolved(s),
      }));
    },
    takeNext: () => {
      const [next, ...rest] = get().queue;
      if (next) set({ queue: rest });
      return next;
    },
  }));
}
