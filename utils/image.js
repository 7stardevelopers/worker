import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const MAX_EDGE = 1600;

/**
 * Downscales a camera/gallery photo to at most 1600px on its long edge and
 * re-encodes it as JPEG (~200–400 KB). Keeps document uploads (sent as base64
 * through the API, which caps requests at ~6 MB) and proof uploads fast.
 */
export async function compressImage(uri, { width, height, base64 = false } = {}) {
  const context = ImageManipulator.manipulate(uri);
  if (width && height) {
    const scale = MAX_EDGE / Math.max(width, height);
    if (scale < 1) context.resize(width >= height ? { width: MAX_EDGE } : { height: MAX_EDGE });
  } else {
    context.resize({ width: MAX_EDGE });
  }
  const image = await context.renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64 });
  return { uri: result.uri, base64: result.base64, mimeType: 'image/jpeg' };
}
