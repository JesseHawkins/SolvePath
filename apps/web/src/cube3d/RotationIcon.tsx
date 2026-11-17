/**
 * Small icons for whole-cube turns: a square (the front of the cube) with
 * an arrow showing which way the front moves.
 *   x: the front goes up      x': down
 *   y: the front goes left    y': right
 *   z: the front turns clockwise    z': counterclockwise
 */
import type { Move } from "@solvepath/cube-core";

const STRAIGHT_ANGLE: Record<string, number> = { x1: 0, x3: 180, y1: -90, y3: 90 };

export function RotationIcon({ move }: { move: Move }) {
  const key = `${move.family}${move.amount}`;
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2.5" y="2.5" width="19" height="19" rx="4" strokeWidth="1.5" opacity="0.5" />
      {move.family === "z" ? (
        <g strokeWidth="2.2" transform={move.amount === 3 ? "matrix(-1 0 0 1 24 0)" : undefined}>
          {/* Three quarters of a circle, clockwise from the top, with the head on the left going up. */}
          <path d="M12 7 A5 5 0 1 1 7 12" />
          <path d="M5 12.5 L7 9.5 L9 12.5" />
        </g>
      ) : (
        <g strokeWidth="2.2" transform={`rotate(${STRAIGHT_ANGLE[key] ?? 0} 12 12)`}>
          <path d="M12 17.5 V6.5" />
          <path d="M8 10.5 L12 6.5 L16 10.5" />
        </g>
      )}
    </svg>
  );
}
