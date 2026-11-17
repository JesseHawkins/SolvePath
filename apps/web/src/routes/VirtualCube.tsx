import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "zustand";
import {
  applyMoves,
  formatAlg,
  formatMove,
  parseAlg,
  solvedState,
  type Move,
} from "@solvepath/cube-core";
import { ARROW_STYLES } from "../cube3d/arrow";
import { CubeView } from "../cube3d/CubeView";
import { createCubeStore } from "../cube3d/store";
import { GuideLink } from "../guide/GuideLink";
import { useCubeSettings } from "../settings/cubeSettings";

/**
 * Layer turn buttons in two groups. Each row of one-layer moves shares an axis.
 * Whole-cube turns (x, y, z) are buttons inside the cube view instead.
 */
const BUTTON_GROUPS = [
  { id: "layer", moves: parseAlg("U U' D D' E E' R R' L L' M M' F F' B B' S S'") },
  { id: "wide", moves: parseAlg("u u' d d' r r' l l' f f' b b'") },
] as const;
const HISTORY_SHOWN = 40;

const button =
  "min-h-11 rounded-xl bg-raised px-4 font-semibold hover:bg-border disabled:opacity-60";
const turnButton: Record<(typeof BUTTON_GROUPS)[number]["id"], string> = {
  layer: "min-h-11 rounded-xl bg-raised font-mono font-semibold hover:bg-border",
  wide: "min-h-11 rounded-xl border-2 border-dashed border-border bg-raised font-mono font-semibold hover:bg-border",
};
const primaryButton =
  "min-h-11 rounded-xl bg-accent px-5 font-semibold text-on-accent disabled:opacity-60";

type Stepping = { moves: Move[]; index: number } | null;

export function VirtualCube() {
  const { t } = useTranslation();
  const store = useMemo(() => createCubeStore(), []);
  const solved = useStore(store, (s) => s.solved);
  const history = useStore(store, (s) => s.history);
  const [scramble, setScramble] = useState<string | null>(null);
  const [scrambling, setScrambling] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState(false);
  const [stepping, setStepping] = useState<Stepping>(null);
  const arrowStyle = useCubeSettings((s) => s.arrowStyle);
  const setArrowStyle = useCubeSettings((s) => s.setArrowStyle);

  const nextStep = stepping ? stepping.moves[stepping.index] : undefined;

  const readMoves = (): Move[] | null => {
    try {
      const moves = parseAlg(text);
      setError(false);
      return moves;
    } catch {
      setError(true);
      return null;
    }
  };

  const doScramble = async () => {
    setScrambling(true);
    setStepping(null);
    try {
      const { randomScrambleForEvent } = await import("cubing/scramble");
      const alg = (await randomScrambleForEvent("333")).toString();
      store.getState().setState(applyMoves(solvedState(), parseAlg(alg)));
      setScramble(alg);
    } finally {
      setScrambling(false);
    }
  };

  const reset = () => {
    store.getState().reset();
    setScramble(null);
    setStepping(null);
  };

  return (
    <section aria-labelledby="cube-heading" className="flex flex-col gap-6">
      <div>
        <h1 id="cube-heading" className="text-3xl font-bold">
          <GuideLink anchor="feature.virtual-cube">{t("cube.heading")}</GuideLink>
        </h1>
        <p className="mt-2 text-muted">{t("cube.intro")}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-3">
          <div className="mx-auto w-full max-w-[min(100%,70dvh)] rounded-3xl border border-border bg-surface">
            <CubeView
              store={store}
              label={t("cube.label")}
              describedBy="cube-help"
              interactive
              arrow={nextStep ?? null}
              arrowStyle={arrowStyle}
              highlightMove={nextStep ?? null}
            />
          </div>
          <p id="cube-help" className="text-sm text-muted">
            {t("cube.help")} <GuideLink anchor="cube.controls">{t("nav.guide")}</GuideLink>
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div
            aria-live="polite"
            className="rounded-2xl border border-border bg-surface p-4"
            data-testid="cube-status"
            data-solved={solved}
          >
            <p className={`text-xl font-bold ${solved ? "text-success" : ""}`}>
              {solved ? t("cube.solved") : t("cube.notSolved")}
            </p>
            <p className="text-sm text-muted">{t("cube.moveCount", { count: history.length })}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={primaryButton}
              onClick={() => void doScramble()}
              disabled={scrambling}
            >
              {scrambling ? t("cube.scrambling") : t("cube.scramble")}
            </button>
            <button
              type="button"
              className={button}
              onClick={() => store.getState().undo()}
              disabled={history.length === 0}
            >
              {t("cube.undo")}
            </button>
            <button type="button" className={button} onClick={reset}>
              {t("cube.reset")}
            </button>
          </div>
          {scramble && (
            <p className="text-sm">
              <span className="text-muted">{t("cube.scrambledWith")}: </span>
              <span className="font-mono" data-testid="cube-scramble">
                {scramble}
              </span>
            </p>
          )}

          <form
            className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4"
            onSubmit={(e) => {
              e.preventDefault();
              const moves = readMoves();
              if (moves) {
                setStepping(null);
                store.getState().doMoves(moves);
              }
            }}
          >
            <label htmlFor="cube-try" className="font-semibold">
              {t("cube.tryLabel")}
            </label>
            <input
              id="cube-try"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("cube.tryPlaceholder")}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-describedby="cube-try-help"
              aria-invalid={error}
              className="min-h-11 rounded-xl border border-border bg-raised px-3 font-mono"
            />
            <p id="cube-try-help" className="text-sm text-muted">
              {error ? (
                <span className="text-danger">{t("cube.badMoves")}</span>
              ) : (
                t("cube.tryHelp")
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="submit" className={primaryButton}>
                {t("cube.doAll")}
              </button>
              <button
                type="button"
                className={button}
                onClick={() => {
                  const moves = readMoves();
                  if (moves && moves.length > 0) setStepping({ moves, index: 0 });
                }}
              >
                {t("cube.stepThrough")}
              </button>
            </div>
            {stepping && (
              <div className="flex flex-col gap-2" data-testid="cube-stepping">
                <p className="text-sm text-muted">
                  {nextStep
                    ? t("cube.stepProgress", {
                        current: stepping.index + 1,
                        total: stepping.moves.length,
                      })
                    : t("cube.stepDone")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {nextStep && (
                    <button
                      type="button"
                      className={primaryButton}
                      onClick={() => {
                        store.getState().doMoves([nextStep]);
                        setStepping({ ...stepping, index: stepping.index + 1 });
                      }}
                    >
                      {t("cube.nextMove", { move: formatMove(nextStep) })}
                    </button>
                  )}
                  <button type="button" className={button} onClick={() => setStepping(null)}>
                    {t("cube.stop")}
                  </button>
                </div>
              </div>
            )}
          </form>

          <fieldset className="rounded-2xl border border-border bg-surface p-4">
            <legend className="px-1 font-semibold">
              <GuideLink anchor="settings.cube.arrows">{t("cube.arrows.legend")}</GuideLink>
            </legend>
            <div className="flex flex-col gap-2">
              {ARROW_STYLES.map((style) => (
                <div key={style} className="flex min-h-11 items-start gap-3">
                  <input
                    id={`cube-arrows-${style}`}
                    type="radio"
                    name="cube-arrow-style"
                    value={style}
                    checked={arrowStyle === style}
                    onChange={() => setArrowStyle(style)}
                    aria-describedby={`cube-arrows-${style}-help`}
                    className="mt-1 size-5 accent-accent"
                  />
                  <div>
                    <label htmlFor={`cube-arrows-${style}`} className="block font-medium">
                      {t(`cube.arrows.${style}`)}
                    </label>
                    <p id={`cube-arrows-${style}-help`} className="text-sm text-muted">
                      {t(`cube.arrows.${style}Help`)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </fieldset>

          {BUTTON_GROUPS.map((group) => (
            <div
              key={group.id}
              role="group"
              aria-labelledby={`cube-buttons-${group.id}`}
              aria-describedby={`cube-buttons-${group.id}-help`}
              className="flex flex-col gap-2"
            >
              <h2 id={`cube-buttons-${group.id}`} className="font-semibold">
                {t(`cube.buttons.${group.id}.title`)}
              </h2>
              <p id={`cube-buttons-${group.id}-help`} className="-mt-1 text-sm text-muted">
                {t(`cube.buttons.${group.id}.help`)}
              </p>
              <div className="grid grid-cols-6 gap-2">
                {group.moves.map((move) => {
                  const name = formatMove(move);
                  return (
                    <button
                      key={name}
                      type="button"
                      className={turnButton[group.id]}
                      aria-label={t("cube.turn", { move: name })}
                      onClick={() => store.getState().doMoves([move])}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="rounded-2xl border border-border bg-surface p-4">
            <h2 className="font-semibold">{t("cube.history")}</h2>
            <p className="mt-1 break-words font-mono text-sm" data-testid="cube-history">
              {history.length === 0 ? (
                <span className="text-muted">{t("cube.noMoves")}</span>
              ) : (
                <>
                  {history.length > HISTORY_SHOWN && "... "}
                  {formatAlg(history.slice(-HISTORY_SHOWN))}
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
