
import { supabase } from '@/app/integrations/supabase/client';
import * as ImageManipulator from 'expo-image-manipulator';

export interface ImageUploadResult {
  publicUrl: string;
  path: string;
}

/**
 * Uploads an image to Supabase Storage
 * @param imageUri - Local URI of the image to upload
 * @param bucket - Storage bucket name (default: 'avatars')
 * @param folder - Optional folder path within the bucket
 * @param maxWidth - Maximum width for image compression (default: 800)
 * @param maxHeight - Maximum height for image compression (default: 800)
 * @param quality - Image quality 0-1 (default: 0.8)
 * @returns Promise with public URL and storage path
 */
export async function uploadImageToStorage(
  imageUri: string,
  bucket: string = 'avatars',
  folder?: string,
  maxWidth: number = 800,
  maxHeight: number = 800,
  quality: number = 0.8
): Promise<ImageUploadResult> {
  try {
    console.log('[ImageUpload] Starting upload process for:', imageUri);

    // Step 1: Compress and resize the image
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: maxWidth, height: maxHeight } }],
      { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
    );

    console.log('[ImageUpload] Image compressed:', manipulatedImage.uri);

    // Step 2: Convert image to blob
    const response = await fetch(manipulatedImage.uri);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const fileData = new Uint8Array(arrayBuffer);

    console.log('[ImageUpload] Image converted to binary, size:', fileData.length, 'bytes');

    // Step 3: Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const fileName = `${timestamp}-${randomString}.jpg`;
    
    // Build the storage path
    const storagePath = folder ? `${folder}/${fileName}` : fileName;

    console.log('[ImageUpload] Uploading to bucket:', bucket, 'path:', storagePath);

    // Step 4: Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, fileData, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      console.error('[ImageUpload] Upload error:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    console.log('[ImageUpload] Upload successful:', uploadData);

    // Step 5: Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(storagePath);

    console.log('[ImageUpload] Public URL generated:', urlData.publicUrl);

    return {
      publicUrl: urlData.publicUrl,
      path: storagePath,
    };
  } catch (error) {
    console.error('[ImageUpload] Unexpected error:', error);
    throw error;
  }
}

/**
 * Deletes an image from Supabase Storage
 * @param path - Storage path of the image to delete
 * @param bucket - Storage bucket name (default: 'avatars')
 */
export async function deleteImageFromStorage(
  path: string,
  bucket: string = 'avatars'
): Promise<void> {
  try {
    console.log('[ImageUpload] Deleting image from bucket:', bucket, 'path:', path);

    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      console.error('[ImageUpload] Delete error:', error);
      throw new Error(`Delete failed: ${error.message}`);
    }

    console.log('[ImageUpload] Image deleted successfully');
  } catch (error) {
    console.error('[ImageUpload] Unexpected error during deletion:', error);
    throw error;
  }
}

/**
 * Extracts the storage path from a public URL
 * @param publicUrl - The public URL from Supabase Storage
 * @param bucket - Storage bucket name (default: 'avatars')
 * @returns The storage path or null if invalid URL
 */
export function extractStoragePathFromUrl(
  publicUrl: string,
  bucket: string = 'avatars'
): string | null {
  try {
    const url = new URL(publicUrl);
    const pathParts = url.pathname.split('/');
    const bucketIndex = pathParts.indexOf(bucket);
    
    if (bucketIndex === -1) {
      return null;
    }
    
    return pathParts.slice(bucketIndex + 1).join('/');
  } catch (error) {
    console.error('[ImageUpload] Error extracting path from URL:', error);
    return null;
  }
}

export default {
  uploadImageToStorage,
  deleteImageFromStorage,
  extractStoragePathFromUrl,
};
