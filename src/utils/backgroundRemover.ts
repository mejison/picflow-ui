import { removeBackground } from '@imgly/background-removal';

export interface BackgroundRemovalOptions {
  format?: 'png' | 'jpg' | 'webp';
  quality?: number;
}

export interface BackgroundRemovalResult {
  blob: Blob;
  url: string;
  filename: string;
  originalSize: number;
  newSize: number;
}

export async function removeBgFromImage(
  file: File,
  options: BackgroundRemovalOptions = {}
): Promise<BackgroundRemovalResult> {
  const { format = 'png', quality = 0.95 } = options;

  try {
    // Remove background
    const blob = await removeBackground(file);

    // Convert to desired format if needed
    let resultBlob = blob;
    
    if (format !== 'png' || blob.type !== 'image/png') {
      // Create image from blob
      const img = new Image();
      const blobUrl = URL.createObjectURL(blob);
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = blobUrl;
      });

      // Draw to canvas with transparency
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(blobUrl);

      // Convert to target format
      const mimeType = `image/${format}`;
      resultBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to create blob'));
          },
          mimeType,
          quality
        );
      });
    }

    // Generate filename
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    const filename = `${nameWithoutExt}_no-bg.${format}`;

    // Create URL for preview/download
    const url = URL.createObjectURL(resultBlob);

    return {
      blob: resultBlob,
      url,
      filename,
      originalSize: file.size,
      newSize: resultBlob.size
    };
  } catch (error) {
    throw new Error(`Failed to remove background: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function canRemoveBackground(file: File): boolean {
  const supportedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  return supportedTypes.includes(file.type);
}
