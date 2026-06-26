<template>
  <div class="ai-widget-container">
    <button @click="toggleChat" class="btn btn-primary rounded-circle shadow-lg ai-floating-btn d-flex align-items-center justify-content-center">
      <i class="fas fa-robot"></i>
    </button>

    <div v-if="isOpen" class="card shadow-lg ai-chat-window border-0 rounded-4 overflow-hidden">
      <div class="card-header bg-dark text-white d-flex justify-content-between p-3">
        <h6 class="mb-0">Asisten Gudang</h6>
        <button @click="isOpen = false" class="btn-close btn-close-white"></button>
      </div>
      <div class="card-body bg-light" style="height: 300px; overflow-y: auto;" ref="chatBox">
        <div v-for="(msg, i) in chatHistory" :key="i" class="mb-2 p-2 rounded" :class="msg.role === 'user' ? 'bg-primary text-white text-end' : 'bg-white border'">
          {{ msg.text }}
        </div>
      </div>
      <div class="card-footer p-2">
        <input v-model="userInput" @keyup.enter="kirimPertanyaan" class="form-control" placeholder="Tanya stok..." :disabled="loading">
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const API_KEY = 'AQ.Ab8RN6IFRmyhrDGx636cHQdVsmCLzOoh1nFQ-8_CTekOU6uT0g'.trim()
const isOpen = ref(false)
const userInput = ref('')
const loading = ref(false)
const chatHistory = ref([{ role: 'ai', text: 'Halo Bos! Ada yang bisa dibantu?' }])
const chatBox = ref(null)

// Daftar model cadangan kalau yang satu error
const modelList = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro']

const toggleChat = () => { isOpen.value = !isOpen.value }

const kirimPertanyaan = async () => {
  if (!userInput.value.trim()) return
  
  const pesan = userInput.value
  chatHistory.value.push({ role: 'user', text: pesan })
  userInput.value = ''
  loading.value = true

  // Coba model satu per satu sampai berhasil
  for (const model of modelList) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: pesan }] }] })
      })

      const result = await response.json()
      
      if (response.ok && result.candidates) {
        chatHistory.value.push({ role: 'ai', text: result.candidates[0].content.parts[0].text })
        loading.value = false
        return // Berhasil, keluar dari fungsi
      }
    } catch (err) {
      console.log(`Model ${model} gagal, mencoba model lain...`)
    }
  }

  chatHistory.value.push({ role: 'ai', text: 'Waduh, semua model lagi gangguan nih Bos.' })
  loading.value = false
}
</script>

<style scoped>
.ai-widget-container { position: fixed; bottom: 30px; right: 30px; z-index: 99999; }
.ai-floating-btn { width: 55px; height: 55px; }
.ai-chat-window { position: absolute; bottom: 70px; right: 0; width: 320px; }
</style>
