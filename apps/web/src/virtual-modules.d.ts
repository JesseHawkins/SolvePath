// The Guide pages, compiled from docs/guide/*.md by apps/web/build/guide-plugin.ts.
declare module "virtual:guide" {
  // Relative imports aren't allowed in an ambient module, so this uses an import() type.
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const pages: import("./guide/types").GuidePage[];
  export default pages;
}
