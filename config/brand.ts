/**
 * The app's name and home on the web, kept in one place.
 *
 * Change these two values to rename or move the app. Everything else
 * (page titles, the install manifest, the Guide, deploy docs) reads from here.
 *
 * Trademark note: never put "Rubik's" in the app name, logo, or domain.
 * Descriptive phrases such as "works with any 3x3 puzzle cube" are fine.
 */
export const APP_NAME = "SolvePath";

/** Short tagline used in the install manifest and the home screen. */
export const APP_TAGLINE = "Learn, solve, and speedcube with any 3x3 puzzle cube.";

/** The production domain. Hosting for testing is set per deploy in `.env`. */
export const PRODUCTION_DOMAIN = "solvepath.app";

export const PRODUCTION_URL = `https://${PRODUCTION_DOMAIN}`;

/** Source code home, shown in the About page and the Guide. */
export const SOURCE_URL = "https://github.com/JesseHawkins/SolvePath";
