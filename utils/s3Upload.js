import * as FileSystem from 'expo-file-system/legacy';

export async function uploadToS3(presignedUrl, fileUri, contentType = 'image/jpeg') {
  const result = await FileSystem.uploadAsync(presignedUrl, fileUri, {
    httpMethod: 'PUT',
    headers: { 'Content-Type': contentType },
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
  });
  if (result.status !== 200) {
    throw new Error(`S3 upload failed: ${result.status}`);
  }
  return result;
}
