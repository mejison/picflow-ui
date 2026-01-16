/**
 * Image resize utilities
 * Resize images with aspect ratio preservation
 */

export interface ResizeOptions {
  width?: number;
  height?: number;
  maintainAspectRatio?: boolean;
  quality?: number; // 0-1
  format?: 'png' | 'jpg' | 'jpeg' | 'webp';
}

export interface ResizeResult {
  blob: Blob;
  url: string;
  filename: string;
  originalSize: number;
  newSize: number;
  originalWidth: number;
  originalHeight: number;
  newWidth: number;
  newHeight: number;
}

/**
 * Resize image
 */
export async function resizeImage(
  file: File,
  options: ResizeOptions
): Promise<ResizeResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      const originalWidth = img.width;
      const originalHeight = img.height;
      
      let targetWidth = options.width || originalWidth;
      let targetHeight = options.height || originalHeight;
      
      // Maintain aspect ratio if needed
      if (options.maintainAspectRatio !== false) {
        const aspectRatio = originalWidth / originalHeight;
        
        if (options.width && !options.height) {
          // Only width specified
          targetHeight = Math.round(options.width / aspectRatio);
        } else if (options.height && !options.width) {
          // Only height specified
          targetWidth = Math.round(options.height * aspectRatio);
        } else if (options.width && options.height) {
          // Both specified - fit within bounds
          const widthRatio = options.width / originalWidth;
          const heightRatio = options.height / originalHeight;
          const ratio = Math.min(widthRatio, heightRatio);
          targetWidth = Math.round(originalWidth * ratio);
          targetHeight = Math.round(originalHeight * ratio);
        }
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      // Use high quality scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Determine output format
      const outputFormat = options.format || getFormatFromFile(file);
      
      // Fill white background for JPG
      if (outputFormat === 'jpg' || outputFormat === 'jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
      }
      
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      URL.revokeObjectURL(url);
      
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }
          
          const ext = outputFormat === 'jpeg' ? 'jpg' : outputFormat;
          const newFilename = file.name.replace(/\.[^.]+$/, `_${targetWidth}x${targetHeight}.${ext}`);
          const resultUrl = URL.createObjectURL(blob);
          
          resolve({
            blob,
            url: resultUrl,
            filename: newFilename,
            originalSize: file.size,
            newSize: blob.size,
            originalWidth,
            originalHeight,
            newWidth: targetWidth,
            newHeight: targetHeight
          });
        },
        `image/${outputFormat}`,
        options.quality || 0.92
      );
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
}

/**
 * Get format from file
 */
function getFormatFromFile(file: File): 'png' | 'jpg' | 'webp' {
  const type = file.type.toLowerCase();
  if (type.includes('png')) return 'png';
  if (type.includes('webp')) return 'webp';
  return 'jpg';
}

/**
 * Check if file can be resized
 */
export function canResize(file: File): boolean {
  const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  return supportedTypes.includes(file.type.toLowerCase());
}

/**
 * Get common resize presets
 */
export interface ResizePreset {
  name: string;
  width?: number;
  height?: number;
}

export const RESIZE_PRESETS: ResizePreset[] = [
  { name: 'Instagram Post', width: 1080, height: 1080 },
  { name: 'Instagram Story', width: 1080, height: 1920 },
  { name: 'Facebook Post', width: 1200, height: 630 },
  { name: 'Twitter Post', width: 1200, height: 675 },
  { name: 'YouTube Thumbnail', width: 1280, height: 720 },
  { name: 'HD (1080p)', width: 1920, height: 1080 },
  { name: 'HD (720p)', width: 1280, height: 720 },
  { name: 'Custom', width: undefined, height: undefined }
];
