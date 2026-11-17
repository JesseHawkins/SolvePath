/**
 * A small checker for SPDX license expressions like "MIT", "(MIT OR Apache-2.0)",
 * or "MPL-2.0 OR GPL-3.0-or-later". Used by check-licenses.ts.
 *
 * "A OR B" passes if either side is allowed (we may pick either license).
 * "A AND B" passes only if both are allowed. "X WITH exception" counts as X.
 */
export function isExpressionAllowed(expression: string, allowed: ReadonlySet<string>): boolean {
  const tokens = expression
    .replace(/[()]/g, (p) => ` ${p} `)
    .trim()
    .split(/\s+/);
  let position = 0;

  const peek = () => tokens[position];
  const next = () => tokens[position++];
  const isOp = (token: string | undefined, op: string) => token?.toUpperCase() === op;

  function primary(): boolean {
    const token = next();
    if (token === undefined) throw new Error(`Unexpected end of "${expression}"`);
    if (token === "(") {
      const value = orExpr();
      if (next() !== ")") throw new Error(`Missing ")" in "${expression}"`);
      return value;
    }
    if (isOp(peek(), "WITH")) {
      next();
      next();
    }
    return allowed.has(token.replace(/\+$/, ""));
  }
  function andExpr(): boolean {
    let value = primary();
    while (isOp(peek(), "AND")) {
      next();
      value = primary() && value;
    }
    return value;
  }
  function orExpr(): boolean {
    let value = andExpr();
    while (isOp(peek(), "OR")) {
      next();
      value = andExpr() || value;
    }
    return value;
  }

  const result = orExpr();
  if (position !== tokens.length) throw new Error(`Could not read "${expression}"`);
  return result;
}
