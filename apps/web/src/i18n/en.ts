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
