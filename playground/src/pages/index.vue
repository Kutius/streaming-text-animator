<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, watch } from 'vue'
// 确保路径正确，如果你的库有默认导出，可以这样导入
import StreamingTextAnimator, { type AnimatorOptions } from '../../../src'

// --- Refs for DOM elements ---
const outputTargetRef = ref<HTMLElement | null>(null)

// --- Animator instance ---
let animatorInstance: StreamingTextAnimator | null = null

// --- Reactive form for animator options ---
const optionsForm = reactive<Partial<Omit<AnimatorOptions, 'target'>>>({
  charDelay: 35,
  animationDuration: 0.4,
  charClassName: 'streaming-char',
  styleId: 'streaming-text-animator-styles',
  customKeyframes: '',
  animationName: 'fadeInStream',
})

// --- Input text for streaming ---
const inputText = ref(
  "Hello, this is the StreamingTextAnimator playground!\n\n" +
  "Try changing the options on the left and see the animation update.\n\n" +
  "You can input your own text here and stream it.\n\n" +
  "Enjoy exploring! ✨"
)
const isStreaming = ref(false)
let streamIntervalId: number | null = null

// --- Helper to generate config string for display ---
const currentConfigString = ref('')
watch(optionsForm, () => {
  const displayOptions: any = { ...optionsForm };
  if (!displayOptions.customKeyframes) delete displayOptions.customKeyframes; // Don't show empty customKeyframes
  if (displayOptions.animationName === 'fadeInStream' && !displayOptions.customKeyframes) delete displayOptions.animationName;

  currentConfigString.value = `new StreamingTextAnimator({\n  target: outputTargetRef.value, // (your target element)\n${Object.entries(displayOptions)
    .map(([key, value]) => `  ${key}: ${JSON.stringify(value)},`)
    .join('\n')}\n});`;
}, { deep: true, immediate: true });


// --- Animator Logic ---
function initializeAnimator() {
  if (!outputTargetRef.value) {
    console.error("Target element for animation not found.")
    return
  }

  // Destroy previous instance if exists
  if (animatorInstance) {
    animatorInstance.destroy(true) // removeInjectedStyle = true
  }

  // Clear target content manually before new init
  outputTargetRef.value.innerHTML = '';

  const animatorConfig: AnimatorOptions = {
    target: outputTargetRef.value,
    charDelay: Number(optionsForm.charDelay) || 35,
    animationDuration: Number(optionsForm.animationDuration) || 0.4,
    charClassName: optionsForm.charClassName || 'streaming-char',
    styleId: optionsForm.styleId || 'streaming-text-animator-styles', // Allow empty to disable injection
    animationName: optionsForm.animationName || 'fadeInStream',
  }

  if (optionsForm.customKeyframes && optionsForm.customKeyframes.trim() !== '') {
    animatorConfig.customKeyframes = optionsForm.customKeyframes
  }

  try {
    animatorInstance = new StreamingTextAnimator(animatorConfig)
    console.log("Animator initialized with options:", animatorConfig)
  } catch (error) {
    console.error("Failed to initialize animator:", error)
    alert(`Failed to initialize animator: ${(error as Error).message}`)
  }
}

function startStreaming() {
  if (!animatorInstance) {
    alert("Please initialize the animator first (or re-initialize if options changed).")
    return
  }
  if (isStreaming.value) return

  isStreaming.value = true
  animatorInstance.reset(true) // Clear previous content

  const textToStream = inputText.value
  let currentIndex = 0
  const chunkSize = 5 // Stream 5 characters at a time for demo

  function streamChunk() {
    if (currentIndex < textToStream.length) {
      const chunk = textToStream.substring(currentIndex, Math.min(currentIndex + chunkSize, textToStream.length))
      animatorInstance?.addChunk(chunk)
      currentIndex += chunk.length
      streamIntervalId = window.setTimeout(streamChunk, 100) // Simulate network delay for chunks
    } else {
      isStreaming.value = false
      console.log("Streaming finished.")
    }
  }
  streamChunk()
}

function resetAnimation() {
  if (streamIntervalId) {
    clearTimeout(streamIntervalId)
    streamIntervalId = null
  }
  isStreaming.value = false
  animatorInstance?.reset(true)
}

function destroyAnimator() {
  if (streamIntervalId) {
    clearTimeout(streamIntervalId)
    streamIntervalId = null
  }
  isStreaming.value = false
  animatorInstance?.destroy(true) // removeInjectedStyle = true
  animatorInstance = null
  if (outputTargetRef.value) outputTargetRef.value.innerHTML = 'Animator destroyed. Re-initialize to use again.';
  console.log("Animator destroyed.")
}

onMounted(() => {
  // Initial setup
  if (outputTargetRef.value) {
    initializeAnimator() // Initialize on mount with default options
  } else {
    // Wait for ref to be available (though with defineExpose it should be)
    const observer = new MutationObserver(() => {
      if (outputTargetRef.value) {
        initializeAnimator();
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
});

onBeforeUnmount(() => {
  if (streamIntervalId) clearTimeout(streamIntervalId)
  animatorInstance?.destroy(true)
})

const defaultKeyframes = `@keyframes fadeInStream {\n  from { opacity: 0; transform: translateY(2px); }\n  to { opacity: 1; transform: translateY(0); }\n}`;
</script>

<template>
  <div class="p-4 md:p-8 min-h-screen bg-gray-100 text-gray-800">
    <header class="mb-8 text-center">
      <h1 class="text-4xl font-bold text-teal-700">Streaming Text Animator Playground</h1>
      <p class="text-gray-600">Test and configure the `streaming-text-animator` library.</p>
    </header>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Controls Column -->
      <aside class="md:col-span-1 bg-white p-6 rounded-lg shadow-lg space-y-6">
        <h2 class="text-2xl font-semibold text-teal-600 border-b pb-2">Options</h2>

        <div>
          <label for="charDelay" class="block text-sm font-medium text-gray-700">Char Delay (ms)</label>
          <input type="number" id="charDelay" v-model.number="optionsForm.charDelay"
                 class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500">
        </div>

        <div>
          <label for="animationDuration" class="block text-sm font-medium text-gray-700">Animation Duration (s)</label>
          <input type="number" step="0.1" id="animationDuration" v-model.number="optionsForm.animationDuration"
                 class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500">
        </div>

        <div>
          <label for="charClassName" class="block text-sm font-medium text-gray-700">Character CSS Class</label>
          <input type="text" id="charClassName" v-model="optionsForm.charClassName"
                 class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500">
        </div>

        <div>
          <label for="styleId" class="block text-sm font-medium text-gray-700">Injected Style ID (empty to disable)</label>
          <input type="text" id="styleId" v-model="optionsForm.styleId"
                 class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
                 placeholder="e.g., streaming-text-animator-styles">
        </div>

        <div>
          <label for="animationName" class="block text-sm font-medium text-gray-700">Animation Name</label>
          <input type="text" id="animationName" v-model="optionsForm.animationName"
                 class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
                 placeholder="e.g., fadeInStream or your custom one">
        </div>

        <div>
          <label for="customKeyframes" class="block text-sm font-medium text-gray-700">Custom CSS Keyframes (optional)</label>
          <textarea id="customKeyframes" v-model="optionsForm.customKeyframes" rows="5"
                    class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 font-mono text-sm"
                    :placeholder="defaultKeyframes"></textarea>
          <p class="mt-1 text-xs text-gray-500">If provided, this will be used instead of the default. Ensure `Animation Name` matches.</p>
        </div>

        <button @click="initializeAnimator"
                class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md shadow transition duration-150">
          Re-initialize Animator
        </button>
      </aside>

      <!-- Main Area Column -->
      <main class="md:col-span-2 space-y-6">
        <section class="bg-white p-6 rounded-lg shadow-lg">
          <h2 class="text-2xl font-semibold text-teal-600 border-b pb-2 mb-4">Animation Output</h2>
          <div ref="outputTargetRef" id="animation-output-target"
               class="min-h-48 p-4 border border-gray-200 rounded-md bg-gray-50 overflow-y-auto whitespace-pre-wrap font-mono">
            <!-- Animation will appear here -->
          </div>
        </section>

        <section class="bg-white p-6 rounded-lg shadow-lg">
          <h2 class="text-2xl font-semibold text-teal-600 border-b pb-2 mb-4">Input & Controls</h2>
          <div>
            <label for="inputText" class="block text-sm font-medium text-gray-700">Text to Stream:</label>
            <textarea id="inputText" v-model="inputText" rows="6"
                      class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 font-mono text-sm"></textarea>
          </div>
          <div class="mt-4 flex space-x-3">
            <button @click="startStreaming" :disabled="isStreaming"
                    class="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md shadow transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed">
              {{ isStreaming ? 'Streaming...' : 'Start Streaming Text' }}
            </button>
            <button @click="resetAnimation"
                    class="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded-md shadow transition duration-150">
              Reset Animation
            </button>
            <button @click="destroyAnimator"
                    class="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-md shadow transition duration-150">
              Destroy Animator
            </button>
          </div>
        </section>

        <section class="bg-white p-6 rounded-lg shadow-lg">
          <h2 class="text-2xl font-semibold text-teal-600 border-b pb-2 mb-4">Current Configuration Code</h2>
          <pre class="bg-gray-800 text-gray-200 p-4 rounded-md overflow-x-auto text-sm font-mono">{{ currentConfigString }}</pre>
        </section>
      </main>
    </div>

    <footer class="mt-12 text-center text-sm text-gray-500">
      <p>Streaming Text Animator Playground. Built with Vue, Vite, and UnoCSS.</p>
    </footer>
  </div>
</template>

<style scoped>
/* You can add component-specific styles here if needed,
   but UnoCSS should handle most styling via utility classes. */
#animation-output-target {
  line-height: 1.6; /* Ensure good readability for streamed text */
}
</style>
