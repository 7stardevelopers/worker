import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const MAX_EDGE = 1600;

/**
 * Downscales a camera/gallery photo to at most 1600px (or `maxEdge`) on its long edge and
 * re-encodes it as JPEG (~200–400 KB). Keeps document uploads (sent as base64
 * through the API, which caps requests at ~6 MB) and proof uploads fast.
 */
export async function compressImage(uri, { width, height, base64 = false, maxEdge = MAX_EDGE } = {}) {
  const context = ImageManipulator.manipulate(uri);
  if (width && height) {
    const scale = maxEdge / Math.max(width, height);
    if (scale < 1) context.resize(width >= height ? { width: maxEdge } : { height: maxEdge });
  } else {
    context.resize({ width: maxEdge });
  }
  const image = await context.renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64 });
  return { uri: result.uri, base64: result.base64, mimeType: 'image/jpeg' };
}
