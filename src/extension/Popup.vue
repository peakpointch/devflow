<script setup>
import { ref, onMounted } from 'vue';

const port = ref(3000);
const isEnabled = ref(false);
const isProcessing = ref(false);
const manifest = __manifest__;

onMounted(() => {
  // Get both port and current enabled status
  chrome.storage.local.get(["port", "enabled"], (result) => {
    if (result.port) port.value = parseInt(result.port.toString());
    isEnabled.value = !!result.enabled;
  });
});

const toggleConnection = () => {
  isProcessing.value = true;
  const newStatus = !isEnabled.value;
  const portValue = Number(port.value);

  // Save state to storage so it persists
  chrome.storage.local.set({ port: portValue, enabled: newStatus }, () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        // Send the toggle command to client.ts
        chrome.tabs.sendMessage(tabs[0].id, { 
          type: "TOGGLE_LIVERELOAD", 
          enabled: newStatus,
          port: portValue 
        });
      }

      setTimeout(() => {
        isEnabled.value = newStatus;
        isProcessing.value = false;
        // Optional: window.close() if you want it to shut on connect
        if (newStatus) window.close();
      }, 150);
    });
  });
};
</script>

<template>
  <div class="flex flex-col gap-4 w-[220px] p-4 bg-zinc-900 text-zinc-100 antialiased border border-zinc-800 rounded-lg">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div 
          class="w-2 h-2 rounded-full transition-all duration-500"
          :class="isEnabled ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-zinc-600'"
        ></div>
        <span class="text-[10px] font-bold uppercase tracking-tighter text-zinc-400">
          Devflow {{ manifest.version }}
        </span>
      </div>
      <span class="text-[9px] font-medium px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 uppercase">
        {{ isEnabled ? 'Active' : 'Offline' }}
      </span>
    </div>

    <div class="space-y-1.5">
      <label for="port" class="text-[10px] text-zinc-500 font-semibold uppercase ml-0.5">Proxy Port</label>
      <input 
        id="port"
        type="number" 
        v-model="port"
        :disabled="isEnabled"
        class="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 transition-all disabled:opacity-50"
        placeholder="3000"
      />
    </div>

    <button 
      @click="toggleConnection"
      :disabled="isProcessing"
      class="w-full text-xs font-bold py-2.5 rounded transition-all shadow-lg active:translate-y-[1px] disabled:opacity-50"
      :class="isEnabled 
        ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700' 
        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20'"
    >
      <span v-if="isProcessing">Processing...</span>
      <span v-else>{{ isEnabled ? 'Disconnect' : 'Connect to Designer' }}</span>
    </button>
  </div>
</template>
