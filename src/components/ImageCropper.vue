<script setup lang="ts">
import { ref } from 'vue';
import { Cropper, CircleStencil, RectangleStencil } from 'vue-advanced-cropper';
import 'vue-advanced-cropper/dist/style.css';

interface Props {
  imageUrl: string;
  fileName: string;
}

interface Emits {
  (e: 'close'): void;
  (e: 'crop', result: { blob: Blob; url: string; width: number; height: number }): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const cropper = ref();
const stencilType = ref<'rectangle' | 'circle'>('rectangle');
const aspectRatio = ref<number | undefined>(undefined);

const aspectRatios = [
  { name: 'Free', value: undefined },
  { name: '1:1 (Square)', value: 1 },
  { name: '4:3', value: 4 / 3 },
  { name: '16:9', value: 16 / 9 },
  { name: '9:16 (Story)', value: 9 / 16 },
  { name: '4:5 (Portrait)', value: 4 / 5 }
];

async function handleCrop() {
  if (!cropper.value) return;
  
  const { canvas } = cropper.value.getResult();
  if (!canvas) return;
  
  canvas.toBlob((blob) => {
    if (!blob) return;
    
    const url = URL.createObjectURL(blob);
    emit('crop', {
      blob,
      url,
      width: canvas.width,
      height: canvas.height
    });
  }, 'image/png', 0.95);
}

function handleClose() {
  emit('close');
}
</script>

<template>
  <div class="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="p-6 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-gray-800">Crop Image</h2>
          <p class="text-sm text-gray-500 mt-1">{{ fileName }}</p>
        </div>
        <button @click="handleClose" class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Toolbar -->
      <div class="p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50 flex flex-wrap gap-4">
        <!-- Aspect Ratio -->
        <div class="flex items-center gap-3">
          <label class="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            Aspect Ratio:
          </label>
          <select 
            v-model="aspectRatio" 
            class="px-4 py-2 border-2 border-gray-200 rounded-xl text-sm bg-white font-medium focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
          >
            <option v-for="ratio in aspectRatios" :key="ratio.name" :value="ratio.value">
              {{ ratio.name }}
            </option>
          </select>
        </div>

        <!-- Stencil Type -->
        <div class="flex items-center gap-3">
          <label class="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Shape:
          </label>
          <div class="flex gap-2">
            <button
              @click="stencilType = 'rectangle'"
              class="px-4 py-2 rounded-xl text-sm font-medium transition-all"
              :class="stencilType === 'rectangle' ? 'bg-purple-600 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-100 border-2 border-gray-200'"
            >
              Rectangle
            </button>
            <button
              @click="stencilType = 'circle'"
              class="px-4 py-2 rounded-xl text-sm font-medium transition-all"
              :class="stencilType === 'circle' ? 'bg-purple-600 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-100 border-2 border-gray-200'"
            >
              Circle
            </button>
          </div>
        </div>
      </div>

      <!-- Cropper -->
      <div class="flex-1 overflow-auto p-6 bg-gradient-to-br from-gray-50 to-gray-100">
        <Cropper
          ref="cropper"
          :src="imageUrl"
          :stencil-component="stencilType === 'circle' ? CircleStencil : RectangleStencil"
          :stencil-props="{
            aspectRatio: aspectRatio,
            movable: true,
            resizable: true
          }"
          class="cropper"
        />
      </div>

      <!-- Footer Actions -->
      <div class="p-6 border-t border-gray-200 bg-white flex justify-end gap-3">
        <button
          @click="handleClose"
          class="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-medium"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Cancel
        </button>
        <button
          @click="handleCrop"
          class="inline-flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 hover:shadow-xl transition-all font-medium"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          Apply Crop
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cropper {
  max-height: 500px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
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
</style>
