/**
 * Image compression utilities
 * Compresses images while maintaining quality
 */

import imageCompression from 'browser-image-compression';

export interface CompressionOptions {
  maxSizeMB?: number; // Max file size in MB
  maxWidthOrHeight?: number; // Max width or height
  useWebWorker?: boolean;
  quality?: number; // 0-1
  preserveExif?: boolean;
}

export interface CompressionResult {
  blob: Blob;
  url: string;
  filename: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number; // percentage
}

/**
 * Compress image file
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  try {
    const compressOptions = {
      maxSizeMB: options.maxSizeMB || 1,
      maxWidthOrHeight: options.maxWidthOrHeight,
      useWebWorker: options.useWebWorker !== false,
      initialQuality: options.quality || 0.8,
      preserveExif: options.preserveExif !== false
    };

    const compressedFile = await imageCompression(file, compressOptions);
    
    const url = URL.createObjectURL(compressedFile);
    const compressionRatio = Math.round((1 - compressedFile.size / file.size) * 100);

    return {
      blob: compressedFile,
      url,
      filename: file.name,
      originalSize: file.size,
      compressedSize: compressedFile.size,
      compressionRatio
    };
  } catch (error) {
    throw new Error(`Failed to compress image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if file can be compressed
 */
export function canCompress(file: File): boolean {
  const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  return supportedTypes.includes(file.type.toLowerCase());
}

/**
 * Get recommended compression settings based on file size
 */
export function getRecommendedSettings(fileSizeBytes: number): CompressionOptions {
  const sizeMB = fileSizeBytes / (1024 * 1024);
  
  if (sizeMB < 1) {
    return { maxSizeMB: 0.5, quality: 0.9 };
  } else if (sizeMB < 5) {
    return { maxSizeMB: 1, quality: 0.85 };
  } else if (sizeMB < 10) {
    return { maxSizeMB: 2, quality: 0.8 };
  } else {
    return { maxSizeMB: 3, quality: 0.75 };
  }
}
