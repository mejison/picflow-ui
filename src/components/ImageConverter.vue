<script setup lang="ts">
import { ref, computed } from 'vue';
import ImageCropper from './ImageCropper.vue';
import { 
  convertImage, 
  getSupportedOutputFormats, 
  formatBytes,
  type ConversionOptions,
  type ConversionResult 
} from '../utils/imageConverter';
import { 
  compressImage, 
  canCompress,
  getRecommendedSettings,
  type CompressionOptions,
  type CompressionResult 
} from '../utils/imageCompressor';
import { 
  resizeImage, 
  canResize,
  RESIZE_PRESETS,
  type ResizeOptions,
  type ResizeResult 
} from '../utils/imageResizer';
import {
  removeBgFromImage,
  type BackgroundRemovalOptions,
  type BackgroundRemovalResult
} from '../utils/backgroundRemover';

type Mode = 'convert' | 'compress' | 'resize' | 'crop' | 'remove-bg';

interface FileItem {
  id: string;
  file: File;
  preview?: string;
  mode: Mode;
  // Conversion options
  outputFormat: 'png' | 'jpg' | 'webp';
  quality: number;
  // Compression options
  compressionLevel: number; // 1-5: 1=Best Quality, 5=Maximum Compression
  maxSizeMB: number;
  maxWidthOrHeight?: number;
  // Resize options
  resizePreset: string;
  resizeWidth?: number;
  resizeHeight?: number;
  maintainAspectRatio: boolean;
  // Results
  result?: ConversionResult | CompressionResult | ResizeResult | BackgroundRemovalResult;
  processing: boolean;
  error?: string;
  removing?: boolean;
}

const files = ref<FileItem[]>([]);
const isDragging = ref(false);
const defaultMode = ref<Mode>('compress');
const resizePresets = RESIZE_PRESETS;
const cropperModal = ref<{ fileItem: FileItem; imageUrl: string } | null>(null);

const hasFiles = computed(() => files.value.length > 0);
const allProcessed = computed(() => 
  files.value.length > 0 && files.value.every(f => f.result || f.error)
);

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function getCompressionSettings(level: number): { maxSizeMB: number; quality: number } {
  const settings = [
    { maxSizeMB: 5, quality: 0.95 },   // 1 - Best Quality
    { maxSizeMB: 3, quality: 0.85 },   // 2 - High Quality
    { maxSizeMB: 2, quality: 0.75 },   // 3 - Balanced
    { maxSizeMB: 1, quality: 0.65 },   // 4 - Smaller Size
    { maxSizeMB: 0.5, quality: 0.50 }  // 5 - Maximum Compression
  ];
  const setting = settings[level - 1];
  return setting ?? { maxSizeMB: 2, quality: 0.75 }; // Default to Balanced
}

function getCompressionLabel(level: number): string {
  const labels = [
    'Best Quality',
    'High Quality', 
    'Balanced',
    'Smaller Size',
    'Maximum Compression'
  ];
  const label = labels[level - 1];
  return label ?? 'Balanced';
}

function handleDragOver(e: DragEvent) {
  e.preventDefault();
  isDragging.value = true;
}

function handleDragLeave() {
  isDragging.value = false;
}

function handleDrop(e: DragEvent) {
  e.preventDefault();
  isDragging.value = false;
  
  const droppedFiles = Array.from(e.dataTransfer?.files || []);
  addFiles(droppedFiles);
}

function handleFileInput(e: Event) {
  const input = e.target as HTMLInputElement;
  const selectedFiles = Array.from(input.files || []);
  addFiles(selectedFiles);
  input.value = ''; // Reset input
}

function addFiles(newFiles: File[]) {
  const imageFiles = newFiles.filter(file => {
    const supportedFormats = getSupportedOutputFormats(file);
    return supportedFormats.length > 0 || canCompress(file) || canResize(file);
  });
  
  const fileItems: FileItem[] = imageFiles.map(file => {
    const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
    
    // Generate preview for raster images
    let preview: string | undefined;
    if (!isSvg && !isPdf) {
      preview = URL.createObjectURL(file);
    }
    
    // Get recommended compression settings
    const recommended = getRecommendedSettings(file.size);
    
    return {
      id: generateId(),
      file,
      preview,
      mode: defaultMode.value,
      outputFormat: 'jpg',
      quality: 0.85,
      compressionLevel: 3, // Default to Balanced
      maxSizeMB: recommended.maxSizeMB || 1,
      resizePreset: 'Custom',
      resizeWidth: undefined,
      resizeHeight: undefined,
      maintainAspectRatio: true,
      processing: false
    };
  });
  
  files.value.push(...fileItems);
}

function removeFile(id: string) {
  const index = files.value.findIndex(f => f.id === id);
  if (index !== -1) {
    const fileItem = files.value[index];
    if (!fileItem) return;
    
    // Add removing class for animation
    fileItem.removing = true;
    
    // Wait for animation to complete before removing
    setTimeout(() => {
      if (!fileItem) return;
      
      // Cleanup URLs
      if (fileItem.preview) {
        URL.revokeObjectURL(fileItem.preview);
      }
      if (fileItem.result) {
        URL.revokeObjectURL(fileItem.result.url);
      }
      
      files.value.splice(index, 1);
    }, 300); // Match animation duration
  }
}

async function processFile(fileItem: FileItem) {
  fileItem.processing = true;
  fileItem.error = undefined;
  
  try {
    if (fileItem.mode === 'compress') {
      const settings = getCompressionSettings(fileItem.compressionLevel);
      const options: CompressionOptions = {
        maxSizeMB: settings.maxSizeMB,
        maxWidthOrHeight: fileItem.maxWidthOrHeight,
        quality: settings.quality
      };
      
      fileItem.result = await compressImage(fileItem.file, options);
    } else if (fileItem.mode === 'resize') {
      const options: ResizeOptions = {
        width: fileItem.resizeWidth,
        height: fileItem.resizeHeight,
        maintainAspectRatio: fileItem.maintainAspectRatio,
        quality: fileItem.quality,
        format: fileItem.outputFormat
      };
      
      fileItem.result = await resizeImage(fileItem.file, options);
    } else if (fileItem.mode === 'remove-bg') {
      const options: BackgroundRemovalOptions = {
        format: fileItem.outputFormat,
        quality: fileItem.quality
      };
      
      fileItem.result = await removeBgFromImage(fileItem.file, options);
    } else {
      const options: ConversionOptions = {
        format: fileItem.outputFormat,
        quality: fileItem.quality,
        maintainAspectRatio: true
      };
      
      fileItem.result = await convertImage(fileItem.file, options);
    }
  } catch (err) {
    fileItem.error = err instanceof Error ? err.message : 'Processing failed';
  } finally {
    fileItem.processing = false;
  }
}

async function processAll() {
  const unprocessed = files.value.filter(f => !f.result && !f.error);
  
  for (const fileItem of unprocessed) {
    await processFile(fileItem);
  }
}

function downloadFile(fileItem: FileItem) {
  if (!fileItem.result) return;
  
  const a = document.createElement('a');
  a.href = fileItem.result.url;
  a.download = fileItem.result.filename;
  a.click();
}

function downloadAll() {
  files.value.forEach(fileItem => {
    if (fileItem.result) {
      downloadFile(fileItem);
    }
  });
}

function clearAll() {
  files.value.forEach(fileItem => {
    if (fileItem.preview) URL.revokeObjectURL(fileItem.preview);
    if (fileItem.result) URL.revokeObjectURL(fileItem.result.url);
  });
  files.value = [];
}

function getSavingsText(result: ConversionResult | CompressionResult | ResizeResult | BackgroundRemovalResult): string {
  if ('compressionRatio' in result) {
    return `${result.compressionRatio}% smaller`;
  }
  if ('newWidth' in result && 'newHeight' in result) {
    return `${result.newWidth}x${result.newHeight}`;
  }
  const savings = Math.round((1 - result.newSize / result.originalSize) * 100);
  return savings > 0 ? `${savings}% smaller` : `${Math.abs(savings)}% larger`;
}

function handlePresetChange(fileItem: FileItem) {
  const preset = resizePresets.find(p => p.name === fileItem.resizePreset);
  if (preset && preset.name !== 'Custom') {
    fileItem.resizeWidth = preset.width;
    fileItem.resizeHeight = preset.height;
  } else if (fileItem.resizePreset === 'Custom') {
    // Set default values for custom if not set
    if (!fileItem.resizeWidth) fileItem.resizeWidth = 1920;
    if (!fileItem.resizeHeight) fileItem.resizeHeight = 1080;
  }
}

function openCropper(fileItem: FileItem) {
  const imageUrl = fileItem.preview || URL.createObjectURL(fileItem.file);
  cropperModal.value = { fileItem, imageUrl };
}

function closeCropper() {
  if (cropperModal.value && !cropperModal.value.fileItem.preview) {
    URL.revokeObjectURL(cropperModal.value.imageUrl);
  }
  cropperModal.value = null;
}

function handleCropResult(result: { blob: Blob; url: string; width: number; height: number }) {
  if (!cropperModal.value) return;
  
  const fileItem = cropperModal.value.fileItem;
  
  // Create result similar to ResizeResult
  fileItem.result = {
    blob: result.blob,
    url: result.url,
    filename: fileItem.file.name.replace(/\.[^.]+$/, `_cropped.png`),
    originalSize: fileItem.file.size,
    newSize: result.blob.size,
    originalWidth: 0,
    originalHeight: 0,
    newWidth: result.width,
    newHeight: result.height
  };
  
  closeCropper();
}
</script>

<template>
  <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8 flex-1 flex flex-col">
    <div class="flex-1">
    <!-- Header -->
    <div class="text-center mb-8 sm:mb-12">
      <div class="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-white/10 backdrop-blur-xl mb-4 sm:mb-6 shadow-2xl border border-white/20">
        <svg class="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <h1 class="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-2 sm:mb-3 text-white tracking-tight drop-shadow-lg">PicFlow</h1>
      <p class="text-base sm:text-lg md:text-xl text-white/80 font-light px-4">Powerful image processing in your browser</p>
      
      <!-- Mode Toggle -->
      <div class="inline-flex flex-wrap justify-center gap-2 mt-6 sm:mt-8 p-2 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl max-w-full">
        <button
          @click="defaultMode = 'compress'"
          class="px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl transition-all duration-200 font-medium flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base cursor-pointer"
          :class="defaultMode === 'compress' ? 'bg-white text-indigo-600 shadow-lg scale-105' : 'text-white hover:bg-white/10'"
        >
          <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span class="hidden sm:inline">Compress</span>
          <span class="sm:hidden">Comp</span>
        </button>
        <button
          @click="defaultMode = 'resize'"
          class="px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl transition-all duration-200 font-medium flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base cursor-pointer"
          :class="defaultMode === 'resize' ? 'bg-white text-indigo-600 shadow-lg scale-105' : 'text-white hover:bg-white/10'"
        >
          <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
          Resize
        </button>
        <button
          @click="defaultMode = 'crop'"
          class="px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl transition-all duration-200 font-medium flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base cursor-pointer"
          :class="defaultMode === 'crop' ? 'bg-white text-indigo-600 shadow-lg scale-105' : 'text-white hover:bg-white/10'"
        >
          <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
          </svg>
          Crop
        </button>
        <button
          @click="defaultMode = 'remove-bg'"
          class="px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl transition-all duration-200 font-medium flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base whitespace-nowrap cursor-pointer"
          :class="defaultMode === 'remove-bg' ? 'bg-white text-indigo-600 shadow-lg scale-105' : 'text-white hover:bg-white/10'"
        >
          <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span class="hidden sm:inline">Remove BG</span>
          <span class="sm:hidden">BG</span>
        </button>
        <button
          @click="defaultMode = 'convert'"
          class="px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl transition-all duration-200 font-medium flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base cursor-pointer"
          :class="defaultMode === 'convert' ? 'bg-white text-indigo-600 shadow-lg scale-105' : 'text-white hover:bg-white/10'"
        >
          <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Convert
        </button>
      </div>
    </div>

    <!-- Drop Zone -->
    <div
      v-if="!hasFiles"
      class="border-3 border-dashed rounded-3xl p-16 text-center transition-all duration-300 backdrop-blur-xl shadow-2xl"
      :class="isDragging ? 'border-white bg-white/20 scale-105' : 'border-white/30 bg-white/5 hover:bg-white/10 hover:border-white/50'"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
    >
      <div class="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white/10 mb-6">
        <svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      </div>
      <p class="text-2xl font-semibold mb-3 text-white">Drag & drop images here</p>
      <p class="text-white/70 mb-6 text-lg">or</p>
      <label class="inline-flex items-center gap-3 px-8 py-4 bg-white text-indigo-600 rounded-xl cursor-pointer hover:shadow-2xl transition-all duration-200 font-semibold hover:scale-105">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Browse Files
        <input type="file" multiple accept="image/*,.svg,.heic,.heif,.pdf" class="hidden" @change="handleFileInput">
      </label>
      <div class="flex items-center justify-center gap-2 mt-8 text-white/60">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
        </svg>
        <p class="text-sm">Supports: SVG, PNG, JPG, WebP, HEIC, PDF</p>
      </div>
    </div>

    <!-- Files List -->
    <div v-else class="space-y-5">
      <!-- Action Buttons -->
      <div class="flex flex-wrap gap-3 mb-6 p-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20">
        <label class="inline-flex items-center gap-2 px-5 py-2.5 bg-white/20 text-white rounded-xl cursor-pointer hover:bg-white/30 transition-all font-medium hover:scale-105">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add More
          <input type="file" multiple accept="image/*,.svg,.heic,.heif,.pdf" class="hidden" @change="handleFileInput">
        </label>
        <button 
          @click="processAll" 
          :disabled="allProcessed"
          class="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-600 rounded-xl hover:shadow-xl transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 hover:scale-105 cursor-pointer"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Process All
        </button>
        <button 
          @click="downloadAll"
          :disabled="!allProcessed"
          class="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 hover:shadow-xl transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 hover:scale-105 cursor-pointer"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download All
        </button>
        <button 
          @click="clearAll"
          class="inline-flex items-center gap-2 px-5 py-2.5 bg-red-500/90 text-white rounded-xl hover:bg-red-600 hover:shadow-xl transition-all font-medium hover:scale-105 ml-auto cursor-pointer"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Clear All
        </button>
      </div>

      <!-- File Items -->
      <div 
        v-for="fileItem in files" 
        :key="fileItem.id"
        class="file-card rounded-2xl p-4 sm:p-5 bg-white/95 backdrop-blur-xl shadow-xl border border-white/50 hover:shadow-2xl transition-all duration-300"
        :class="{ 'removing': fileItem.removing }"
      >
        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5">
          <!-- Preview -->
          <div class="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center overflow-hidden shadow-inner">
            <img v-if="fileItem.preview" :src="fileItem.preview" class="max-w-full max-h-full object-contain" />
            <svg v-else class="w-8 h-8 sm:w-10 sm:h-10 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
            </svg>
          </div>

          <!-- File Info -->
          <div class="flex-1 min-w-0">
            <p class="font-semibold truncate text-gray-800 text-lg">{{ fileItem.file.name }}</p>
            <p class="text-sm text-gray-500 font-medium mt-1">{{ formatBytes(fileItem.file.size) }}</p>
            
            <!-- Success -->
            <div v-if="fileItem.result" class="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
              <svg class="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              <span class="text-sm text-emerald-700 font-medium">
                {{ fileItem.mode === 'compress' ? 'Compressed' : fileItem.mode === 'resize' ? 'Resized' : fileItem.mode === 'crop' ? 'Cropped' : fileItem.mode === 'remove-bg' ? 'Background Removed' : 'Converted' }}
                <span class="text-emerald-600">({{ formatBytes(fileItem.result.blob.size) }} - {{ getSavingsText(fileItem.result) }})</span>
              </span>
            </div>
            <div v-if="fileItem.error" class="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
              <svg class="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
              <span class="text-sm text-red-700 font-medium">{{ fileItem.error }}</span>
            </div>
            <div v-if="fileItem.processing" class="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
              <svg class="w-4 h-4 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span class="text-sm text-blue-700 font-medium">Processing...</span>
            </div>
          </div>

          <!-- Mode & Options -->
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <!-- Mode Switch -->
            <select 
              v-model="fileItem.mode"
              :disabled="fileItem.processing || !!fileItem.result"
              class="px-4 py-2 border-2 border-gray-200 rounded-xl disabled:bg-gray-50 disabled:text-gray-400 text-sm font-medium focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all w-full sm:w-auto"
            >
              <option value="compress">🗜️ Compress</option>
              <option value="resize">📐 Resize</option>
              <option value="crop">✂️ Crop</option>
              <option value="remove-bg">🎭 Remove BG</option>
              <option value="convert">🔄 Convert</option>
            </select>

            <!-- Compress Options -->
            <div v-if="fileItem.mode === 'compress'" class="flex items-center gap-3">
              <div class="flex flex-col gap-1">
                <label class="text-xs text-gray-600 font-medium">{{ getCompressionLabel(fileItem.compressionLevel) }}</label>
                <input 
                  type="range" 
                  v-model.number="fileItem.compressionLevel"
                  :disabled="fileItem.processing || !!fileItem.result"
                  min="1" 
                  max="5" 
                  step="1"
                  class="w-40"
                />
                <div class="flex justify-between text-xs text-gray-400">
                  <span>Quality</span>
                  <span>Size</span>
                </div>
              </div>
            </div>

            <!-- Resize Options -->
            <div v-if="fileItem.mode === 'resize'" class="flex items-center gap-3 flex-wrap">
              <select 
                v-model="fileItem.resizePreset"
                @change="handlePresetChange(fileItem)"
                :disabled="fileItem.processing || !!fileItem.result"
                class="px-4 py-2 border-2 border-gray-200 rounded-xl disabled:bg-gray-50 disabled:text-gray-400 text-sm font-medium focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all cursor-pointer"
              >
                <option v-for="preset in resizePresets" :key="preset.name" :value="preset.name">
                  {{ preset.name }}
                </option>
              </select>
              
              <div v-if="fileItem.resizePreset === 'Custom'" class="flex items-center gap-2">
                <input 
                  type="number" 
                  v-model.number="fileItem.resizeWidth"
                  :disabled="fileItem.processing || !!fileItem.result"
                  placeholder="Width"
                  class="w-24 px-3 py-2 border-2 border-gray-200 rounded-xl disabled:bg-gray-50 disabled:text-gray-400 text-sm font-medium focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                />
                <span class="text-gray-400 font-medium">×</span>
                <input 
                  type="number" 
                  v-model.number="fileItem.resizeHeight"
                  :disabled="fileItem.processing || !!fileItem.result"
                  placeholder="Height"
                  class="w-24 px-3 py-2 border-2 border-gray-200 rounded-xl disabled:bg-gray-50 disabled:text-gray-400 text-sm font-medium focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                />
              </div>
              
              <label class="inline-flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl text-sm text-gray-700 font-medium cursor-pointer hover:bg-gray-100 transition-all">
                <input 
                  type="checkbox" 
                  v-model="fileItem.maintainAspectRatio"
                  :disabled="fileItem.processing || !!fileItem.result"
                />
                Keep ratio
              </label>
            </div>

            <!-- Remove BG Options -->
            <div v-if="fileItem.mode === 'remove-bg'" class="flex items-center gap-2">
              <select 
                v-model="fileItem.outputFormat"
                :disabled="fileItem.processing || !!fileItem.result"
                class="px-4 py-2 border-2 border-gray-200 rounded-xl disabled:bg-gray-50 disabled:text-gray-400 text-sm font-medium focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all cursor-pointer"
              >
                <option value="png">PNG</option>
                <option value="jpg">JPG</option>
                <option value="webp">WebP</option>
              </select>
            </div>

            <!-- Convert Options -->
            <div v-if="fileItem.mode === 'convert'" class="flex items-center gap-3">
              <select 
                v-model="fileItem.outputFormat"
                :disabled="fileItem.processing || !!fileItem.result"
                class="px-4 py-2 border-2 border-gray-200 rounded-xl disabled:bg-gray-50 disabled:text-gray-400 text-sm font-medium focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all cursor-pointer"
              >
                <option value="png">PNG</option>
                <option value="jpg">JPG</option>
                <option value="webp">WebP</option>
              </select>

              <!-- Quality Slider for lossy formats -->
              <div v-if="fileItem.outputFormat === 'jpg' || fileItem.outputFormat === 'webp'" class="flex items-center gap-2">
                <input 
                  type="range" 
                  v-model.number="fileItem.quality"
                  :disabled="fileItem.processing || !!fileItem.result"
                  min="0.5" 
                  max="1" 
                  step="0.05"
                  class="w-24"
                />
                <span class="text-sm text-gray-600 w-8">{{ Math.round(fileItem.quality * 100) }}%</span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex flex-wrap gap-2 w-full sm:w-auto">
            <button
              v-if="!fileItem.result && !fileItem.processing && fileItem.mode === 'crop'"
              @click="openCropper(fileItem)"
              class="inline-flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 hover:shadow-lg transition-all text-sm font-medium hover:scale-105 flex-1 sm:flex-initial cursor-pointer"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
              </svg>
              Open Crop
            </button>
            <button
              v-if="!fileItem.result && !fileItem.processing && fileItem.mode !== 'crop'"
              @click="processFile(fileItem)"
              class="inline-flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 hover:shadow-lg transition-all text-sm font-medium hover:scale-105 flex-1 sm:flex-initial cursor-pointer"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {{ fileItem.mode === 'compress' ? 'Compress' : fileItem.mode === 'resize' ? 'Resize' : fileItem.mode === 'remove-bg' ? 'Remove BG' : 'Convert' }}
            </button>

            <button
              v-if="fileItem.result"
              @click="downloadFile(fileItem)"
              class="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 hover:shadow-lg transition-all text-sm font-medium hover:scale-105 flex-1 sm:flex-initial cursor-pointer"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>

            <button
              @click="removeFile(fileItem.id)"
              class="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all hover:scale-110 cursor-pointer"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Cropper Modal -->
    <ImageCropper
      v-if="cropperModal"
      :image-url="cropperModal.imageUrl"
      :file-name="cropperModal.fileItem.file.name"
      @close="closeCropper"
      @crop="handleCropResult"
    />
    </div>

    <!-- Footer -->
    <footer class="mt-auto pt-6 sm:pt-8 border-t border-white/20">
      <div class="flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4 text-white/80">
        <div class="flex items-center gap-2 text-center md:text-left">
          <svg class="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
          <span class="text-xs sm:text-sm font-medium">100% Private - All processing in your browser</span>
        </div>
        
        <div class="flex flex-col sm:flex-row items-center gap-2 sm:gap-6 text-xs sm:text-sm">
          <span>Made with ❤️ by PicFlow</span>
          <span class="text-white/60">© 2026</span>
        </div>
      </div>
      
      <div class="mt-3 sm:mt-4 text-center text-xs text-white/60 px-4">
        No data is uploaded to any server. Your images never leave your device.
      </div>
    </footer>
  </div>
</template>

<style scoped>
.border-3 {
  border-width: 3px;
}

/* File card removing animation */
.file-card {
  animation: slideInUp 0.3s ease-out;
}

.file-card.removing {
  animation: fadeOutScale 0.3s ease-in forwards;
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeOutScale {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.9);
  }
}

/* Custom select dropdown arrow */
select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2.5' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 1rem;
  padding-right: 2.5rem;
}

select:disabled {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%9ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2.5' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
}

/* Custom range slider */
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  cursor: pointer;
  width: 100%;
}

/* Webkit browsers (Chrome, Safari, Edge) */
input[type="range"]::-webkit-slider-track {
  background: rgba(255, 255, 255, 0.3);
  height: 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(147, 51, 234, 0.2);
}

input[type="range"]::-webkit-slider-runnable-track {
  background: rgba(255, 255, 255, 0.3);
  height: 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(147, 51, 234, 0.2);
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  height: 1.25rem;
  width: 1.25rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #9333ea 0%, #a855f7 100%);
  border: 3px solid white;
  box-shadow: 0 2px 8px rgba(124, 58, 237, 0.5);
  cursor: pointer;
  margin-top: -0.375rem;
  transition: all 0.2s;
}

input[type="range"]::-webkit-slider-thumb:hover {
  background: linear-gradient(135deg, #7c3aed 0%, #9333ea 100%);
  transform: scale(1.15);
  box-shadow: 0 4px 16px rgba(124, 58, 237, 0.7);
}

/* Firefox */
input[type="range"]::-moz-range-track {
  background: rgba(255, 255, 255, 0.3);
  height: 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(147, 51, 234, 0.2);
}

input[type="range"]::-moz-range-thumb {
  height: 1.25rem;
  width: 1.25rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #9333ea 0%, #a855f7 100%);
  border: 3px solid white;
  box-shadow: 0 2px 8px rgba(124, 58, 237, 0.5);
  cursor: pointer;
  transition: all 0.2s;
}

input[type="range"]::-moz-range-thumb:hover {
  background: linear-gradient(135deg, #7c3aed 0%, #9333ea 100%);
  transform: scale(1.15);
  box-shadow: 0 4px 16px rgba(124, 58, 237, 0.7);
}

/* Custom checkbox */
input[type="checkbox"] {
  appearance: none;
  -webkit-appearance: none;
  width: 1.125rem;
  height: 1.125rem;
  border: 2px solid #d1d5db;
  border-radius: 0.375rem;
  background: white;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
}

input[type="checkbox"]:checked {
  background: #7c3aed;
  border-color: #7c3aed;
}

input[type="checkbox"]:checked::after {
  content: '';
  position: absolute;
  left: 0.25rem;
  top: 0.0625rem;
  width: 0.375rem;
  height: 0.625rem;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

input[type="checkbox"]:hover:not(:disabled) {
  border-color: #9333ea;
}

input[type="checkbox"]:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
