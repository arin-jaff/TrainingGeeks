import sharp from "sharp";

/** Feed/thumbnail width. One size keeps caching simple and CDNs honest. */
export const FEED_IMAGE_WIDTH = 900;

/**
 * Downscale an image for feed/thumbnail use: capped width, re-encoded as
 * WebP. Never upscales. Falls back to the original bytes (and mime) if the
 * format defeats sharp (e.g. some HEICs), so callers can serve the result
 * unconditionally.
 */
export async function downscaleImage(
  bytes: Buffer,
  mime: string,
  width: number = FEED_IMAGE_WIDTH,
): Promise<{ data: Buffer; mime: string }> {
  try {
    const data = await sharp(bytes)
      .rotate() // honor EXIF orientation
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer();
    return { data, mime: "image/webp" };
  } catch {
    return { data: bytes, mime };
  }
}
