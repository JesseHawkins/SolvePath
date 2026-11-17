/**
 * Settings for the virtual cube, saved on this device.
 *
 * Kept in localStorage for now, like the theme. Player profiles (M9) will
 * move them into each player's settings.
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { ARROW_STYLES, type ArrowStyle } from "../cube3d/arrow";

export interface CubeSettings {
  /** "section": straight arrows on the part that moves. "face": circles on the face that turns. */
  arrowStyle: ArrowStyle;
  setArrowStyle: (style: ArrowStyle) => void;
}

export const useCubeSettings = create<CubeSettings>()(
  persist(
    (set) => ({
      arrowStyle: "section",
      setArrowStyle: (arrowStyle) => set({ arrowStyle }),
    }),
    {
      name: "solvepath.cube",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ arrowStyle: s.arrowStyle }),
      // Ignore anything saved that isn't a style we know.
      merge: (saved, current) => {
        const style = (saved as Partial<CubeSettings> | undefined)?.arrowStyle;
        return ARROW_STYLES.includes(style as ArrowStyle)
          ? { ...current, arrowStyle: style as ArrowStyle }
          : current;
      },
    },
  ),
);
