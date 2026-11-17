// Shapes produced by apps/web/build/guide-compile.ts.
export interface GuideSection {
  anchor: string;
  title: string;
  text: string;
}

export interface GuidePage {
  id: string;
  title: string;
  html: string;
  sections: GuideSection[];
}
