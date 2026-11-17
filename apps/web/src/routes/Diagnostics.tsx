import { useState } from "react";
import { useTranslation } from "react-i18next";
import { GuideLink } from "../guide/GuideLink";

type CheckState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "pass"; scramble: string; solution: string; ms: number }
  | { status: "fail"; error: string };

/**
 * Proves cubing.js works in this browser and this build: it makes a
 * random-state scramble (in cubing.js's own worker), solves it, and checks
 * the solution really returns the cube to solved. Grows into the
 * performance benchmark page in later milestones.
 */
async function runCubeCheck(): Promise<CheckState> {
  const started = performance.now();
  const [{ randomScrambleForEvent }, { experimentalSolve3x3x3IgnoringCenters }, { cube3x3x3 }] =
    await Promise.all([
      import("cubing/scramble"),
      import("cubing/search"),
      import("cubing/puzzles"),
    ]);
  const kpuzzle = await cube3x3x3.kpuzzle();
  const scramble = await randomScrambleForEvent("333");
  const scrambled = kpuzzle.defaultPattern().applyAlg(scramble);
  const solution = await experimentalSolve3x3x3IgnoringCenters(scrambled);
  const solved = scrambled.applyAlg(solution).isIdentical(kpuzzle.defaultPattern());
  if (!solved) return { status: "fail", error: "Solution did not solve the cube." };
  return {
    status: "pass",
    scramble: scramble.toString(),
    solution: solution.toString(),
    ms: Math.round(performance.now() - started),
  };
}

export function Diagnostics() {
  const { t } = useTranslation();
  const [state, setState] = useState<CheckState>({ status: "idle" });

  const run = async () => {
    setState({ status: "running" });
    try {
      setState(await runCubeCheck());
    } catch (error) {
      setState({ status: "fail", error: error instanceof Error ? error.message : String(error) });
    }
  };

  return (
    <section aria-labelledby="diag-heading" className="flex flex-col gap-6">
      <div>
        <h1 id="diag-heading" className="text-3xl font-bold">
          <GuideLink anchor="feature.diagnostics">{t("diagnostics.heading")}</GuideLink>
        </h1>
        <p className="mt-2 text-muted">{t("diagnostics.intro")}</p>
      </div>
      <div>
        <button
          type="button"
          onClick={() => void run()}
          disabled={state.status === "running"}
          className="min-h-11 rounded-xl bg-accent px-5 font-semibold text-on-accent disabled:opacity-60"
        >
          {state.status === "running" ? t("diagnostics.running") : t("diagnostics.run")}
        </button>
      </div>
      <div aria-live="polite" className="rounded-3xl border border-border bg-surface p-6">
        <p data-testid="diag-status" data-status={state.status} className="font-semibold">
          {state.status === "pass" && <span className="text-success">{t("diagnostics.pass")}</span>}
          {state.status === "fail" && <span className="text-danger">{t("diagnostics.fail")}</span>}
        </p>
        {state.status === "pass" && (
          <dl className="mt-3 grid gap-2 font-mono text-sm">
            <dt className="text-muted">{t("diagnostics.scramble")}</dt>
            <dd data-testid="diag-scramble">{state.scramble}</dd>
            <dt className="text-muted">{t("diagnostics.solution")}</dt>
            <dd>{state.solution}</dd>
            <dt className="text-muted">{t("diagnostics.timing")}</dt>
            <dd>{state.ms} ms</dd>
          </dl>
        )}
        {state.status === "fail" && <p className="mt-2 font-mono text-sm">{state.error}</p>}
      </div>
    </section>
  );
}
