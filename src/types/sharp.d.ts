// sharp 0.35 ships no resolvable types through its exports map under
// moduleResolution "bundler". Declare the minimal surface we use (thumb.ts).
declare module "sharp" {
  interface Sharp {
    rotate(): Sharp;
    resize(options: { width?: number; height?: number; withoutEnlargement?: boolean }): Sharp;
    webp(options?: { quality?: number }): Sharp;
    toBuffer(): Promise<Buffer>;
  }
  function sharp(input: Buffer | Uint8Array | string): Sharp;
  export default sharp;
}
