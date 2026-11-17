/**
 * English UI text. Every word the app shows lives in a file like this one,
 * so the app can be translated later by adding another file.
 *
 * Writing style: plain and friendly, easy for a 10-year-old to read.
 * No em dashes.
 */
export const en = {
  common: {
    skipToContent: "Skip to main content",
    opensGuide: "Opens the Guide",
  },
  nav: {
    label: "Main",
    home: "Home",
    guide: "Guide",
    cube: "Cube",
    diagnostics: "Diagnostics",
  },
  home: {
    heading: "Welcome to {{appName}}",
    tagline: "Learn, solve, and speedcube with any 3x3 puzzle cube.",
    building: "We're building this app right now. Here's what's coming:",
    features: {
      scan: "Scan your cube with the camera",
      follow: "Follow easy steps to solve it",
      learn: "Learn new ways to solve, one step at a time",
      timer: "Time your solves and watch yourself get faster",
    },
    readGuide: "Read the Guide",
  },
  theme: {
    label: "Theme",
    dark: "Dark",
    light: "Light",
    "high-contrast": "High contrast",
  },
  guide: {
    title: "Guide",
    intro: "Everything in the app, explained in plain words.",
    searchLabel: "Search the Guide",
    searchPlaceholder: "Try privacy or theme",
    noResults: "No matches. Try a different word.",
    allPages: "All Guide pages",
    notFound: "We couldn't find that Guide page.",
  },
  footer: {
    promise: "Free and open source. No ads. No tracking.",
    source: "Source code",
  },
  notFound: {
    heading: "Page not found",
    body: "This page doesn't exist.",
    goHome: "Go home",
  },
  cube: {
    heading: "Virtual cube",
    intro:
      "A cube you can turn on the screen. Try moves, or practice before you use your real cube.",
    label: "Virtual cube",
    help: "Swipe a row of stickers to turn it. Swipe beside the cube to turn the whole cube. With a keyboard, click the cube first, then use the keys listed in the Guide.",
    noWebgl:
      "This browser can't draw 3D right now. Try turning on hardware acceleration, or use a different browser.",
    solved: "Solved!",
    notSolved: "Not solved yet",
    moveCount_one: "{{count}} move",
    moveCount_other: "{{count}} moves",
    scramble: "Scramble",
    scrambling: "Mixing...",
    scrambledWith: "Scrambled with",
    undo: "Undo",
    reset: "Reset",
    buttonsLabel: "Turn buttons",
    turn: "Turn {{move}}",
    history: "Your moves",
    noMoves: "No moves yet.",
    tryLabel: "Type some moves",
    tryPlaceholder: "R U R' U'",
    tryHelp: "Use letters like R, U, F. Add ' to turn the other way, or 2 to turn twice.",
    doAll: "Do them",
    stepThrough: "One at a time",
    nextMove: "Next move: {{move}}",
    stop: "Stop",
    stepDone: "All done!",
    stepProgress: "Move {{current}} of {{total}}",
    badMoves: "We couldn't read that. Check the letters and try again.",
  },
  diagnostics: {
    heading: "Diagnostics",
    intro: "Checks that this device can run the cube tools.",
    run: "Run check",
    running: "Checking...",
    pass: "All good",
    fail: "Something went wrong",
    scramble: "Scramble",
    solution: "Solution",
    timing: "Time",
  },
} as const;
