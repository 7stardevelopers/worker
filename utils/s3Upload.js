import * as FileSystem from 'expo-file-system/legacy';

export async function uploadToS3(presignedUrl, fileUri, contentType = 'image/jpeg') {
  // FileSystem.uploadAsync doesn't reliably send Content-Type in Expo Go,
  // causing S3 to reject with 400. Reading as base64 and sending raw bytes
  // via fetch gives full control over the header that S3 verifies.
  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const res = await fetch(presignedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: bytes.buffer,
  });

  if (!res.ok) {
    throw new Error(`S3 upload failed: ${res.status}`);
  }
}
