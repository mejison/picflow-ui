/**
 * Image format converter utilities
 * Supports: SVG→PNG, PNG↔JPG, WebP, HEIC→JPG, PDF→PNG
 */

import heic2any from 'heic2any';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker - use local worker from node_modules
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export interface ConversionOptions {
  format: 'png' | 'jpg' | 'jpeg' | 'webp';
  quality?: number; // 0-1 for lossy formats
  width?: number;
  height?: number;
  maintainAspectRatio?: boolean;
  scale?: number; // For SVG→PNG, default 2 for retina
}

export interface ConversionResult {
  blob: Blob;
  url: string;
  filename: string;
  originalSize: number;
  newSize: number;
  format: string;
}

/**
 * Convert SVG to PNG/JPG using Canvas
 */
export async function convertSvgToRaster(
  file: File,
  options: ConversionOptions
): Promise<ConversionResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const svgContent = e.target?.result as string;
      const img = new Image();
      
      img.onload = () => {
        const scale = options.scale || 2; // Default 2x for retina
        const width = options.width || img.width * scale;
        const height = options.height || img.height * scale;
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        // Fill white background for JPG (transparent for PNG)
        if (options.format === 'jpg' || options.format === 'jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob'));
              return;
            }
            
            const newFilename = file.name.replace(/\.svg$/i, `.${options.format}`);
            const url = URL.createObjectURL(blob);
            
            resolve({
              blob,
              url,
              filename: newFilename,
              originalSize: file.size,
              newSize: blob.size,
              format: options.format
            });
          },
          `image/${options.format}`,
          options.quality || 0.92
        );
      };
      
      img.onerror = () => reject(new Error('Failed to load SVG'));
      img.src = 'data:image/svg+xml;base64,' + btoa(svgContent);
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Convert raster formats (PNG↔JPG, WebP)
 */
export async function convertRasterFormat(
  file: File,
  options: ConversionOptions
): Promise<ConversionResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      let width = options.width || img.width;
      let height = options.height || img.height;
      
      // Maintain aspect ratio if needed
      if (options.maintainAspectRatio && (options.width || options.height)) {
        const aspectRatio = img.width / img.height;
        if (options.width && !options.height) {
          height = Math.round(options.width / aspectRatio);
        } else if (options.height && !options.width) {
          width = Math.round(options.height * aspectRatio);
        }
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      // Fill white background for JPG
      if (options.format === 'jpg' || options.format === 'jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }
          
          const ext = options.format === 'jpeg' ? 'jpg' : options.format;
          const newFilename = file.name.replace(/\.[^.]+$/, `.${ext}`);
          const resultUrl = URL.createObjectURL(blob);
          
          resolve({
            blob,
            url: resultUrl,
            filename: newFilename,
            originalSize: file.size,
            newSize: blob.size,
            format: options.format
          });
        },
        `image/${options.format}`,
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
 * Convert PDF to PNG/JPG (first page only)
 */
export async function convertPdfToRaster(
  file: File,
  options: ConversionOptions
): Promise<ConversionResult> {
  try {
    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load PDF document
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    // Get first page
    const page = await pdf.getPage(1);
    
    // Set scale for better quality
    const scale = options.scale || 2;
    const viewport = page.getViewport({ scale });
    
    // Create canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('Failed to get canvas context');
    }
    
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    // Render PDF page to canvas
    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;
    
    // Convert canvas to blob
    return new Promise((resolve, reject) => {
      // Fill white background for JPG
      if (options.format === 'jpg' || options.format === 'jpeg') {
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempContext = tempCanvas.getContext('2d');
        
        if (tempContext) {
          tempContext.fillStyle = '#FFFFFF';
          tempContext.fillRect(0, 0, canvas.width, canvas.height);
          tempContext.putImageData(imageData, 0, 0);
          canvas.width = tempCanvas.width;
          canvas.height = tempCanvas.height;
          context.drawImage(tempCanvas, 0, 0);
        }
      }
      
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob from PDF'));
            return;
          }
          
          const newFilename = file.name.replace(/\.pdf$/i, `.${options.format}`);
          const url = URL.createObjectURL(blob);
          
          resolve({
            blob,
            url,
            filename: newFilename,
            originalSize: file.size,
            newSize: blob.size,
            format: options.format
          });
        },
        `image/${options.format}`,
        options.quality || 0.92
      );
    });
  } catch (error) {
    throw new Error(`Failed to convert PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert HEIC to PNG/JPG using heic2any
 */
export async function convertHeicToRaster(
  file: File,
  options: ConversionOptions
): Promise<ConversionResult> {
  try {
    // Convert HEIC to blob first
    const convertedBlob = await heic2any({
      blob: file,
      toType: `image/${options.format}`,
      quality: options.quality || 0.92
    });
    
    // heic2any can return Blob or Blob[]
    const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
    
    if (!blob) {
      throw new Error('Failed to convert HEIC file');
    }
    
    const newFilename = file.name.replace(/\.heic$/i, `.${options.format}`);
    const url = URL.createObjectURL(blob);
    
    return {
      blob,
      url,
      filename: newFilename,
      originalSize: file.size,
      newSize: blob.size,
      format: options.format
    };
  } catch (error) {
    throw new Error(`Failed to convert HEIC: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Auto-detect and convert any supported format
 */
export async function convertImage(
  file: File,
  options: ConversionOptions
): Promise<ConversionResult> {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  
  // Check for PDF by extension or mime type
  if (fileName.endsWith('.pdf') || fileType === 'application/pdf') {
    return convertPdfToRaster(file, options);
  }
  
  // Check for HEIC by extension or mime type
  if (fileName.endsWith('.heic') || fileName.endsWith('.heif') || 
      fileType === 'image/heic' || fileType === 'image/heif') {
    return convertHeicToRaster(file, options);
  }
  
  if (fileType === 'image/svg+xml' || fileName.endsWith('.svg')) {
    return convertSvgToRaster(file, options);
  }
  
  if (fileType.startsWith('image/')) {
    return convertRasterFormat(file, options);
  }
  
  throw new Error(`Unsupported file type: ${fileType || 'unknown'}`);
}

/**
 * Get supported output formats for a given input file
 */
export function getSupportedOutputFormats(file: File): string[] {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  
  // PDF files
  if (fileName.endsWith('.pdf') || fileType === 'application/pdf') {
    return ['png', 'jpg', 'webp'];
  }
  
  // HEIC files
  if (fileName.endsWith('.heic') || fileName.endsWith('.heif') || 
      fileType === 'image/heic' || fileType === 'image/heif') {
    return ['png', 'jpg', 'webp'];
  }
  
  if (fileType === 'image/svg+xml' || fileName.endsWith('.svg')) {
    return ['png', 'jpg', 'webp'];
  }
  
  if (fileType.startsWith('image/')) {
    return ['png', 'jpg', 'webp'];
  }
  
  return [];
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
