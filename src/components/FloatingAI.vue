<template>
  <div class="ai-widget-container">
    <!-- Tombol selalu ada, tidak bergantung logic berat -->
    <button @click="toggleChat" class="btn btn-primary rounded-circle shadow-lg ai-floating-btn d-flex align-items-center justify-content-center">
      <i class="fas fa-robot"></i>
    </button>

    <!-- Chat window -->
    <div v-if="isOpen" class="card shadow-lg ai-chat-window">
      <div class="card-header bg-dark text-white d-flex justify-content-between p-2">
        <span>Asisten Gudang</span>
        <button @click="isOpen = false" class="btn-close btn-close-white"></button>
      </div>
      <div class="card-body" style="overflow-y: auto; height: 300px;">
        <div v-for="(msg, i) in chatHistory" :key="i" class="mb-2">
          <strong>{{ msg.role === 'user' ? 'Bos:' : 'AI:' }}</strong> {{ msg.text }}
        </div>
      </div>
      <div class="card-footer p-1">
        <input v-model="userInput" @keyup.enter="kirim" class="form-control" placeholder="Tanya stok...">
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// 1. CEK API KEY: Pastikan string-nya bener dan tidak ada typo
const API_KEY = 'AQ.Ab8RN6KW8OeCxk6RuTEyjpNBgBKdwPGjwuKg7vM63wvqgKYigA'.trim() 
const isOpen = ref(false)
const userInput = ref('')
const chatHistory = ref([{ role: 'ai', text: 'Siap Bos!' }])

const toggleChat = () => { isOpen.value = !isOpen.value }

const kirim = async () => {
  if (!userInput.value.trim()) return
  chatHistory.value.push({ role: 'user', text: userInput.value })
  
  try {
    // 2. Gunakan URL v1beta yang paling stabil
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: userInput.value }] }] })
    })

    const data = await response.json()
    if (data.candidates) {
      chatHistory.value.push({ role: 'ai', text: data.candidates[0].content.parts[0].text })
    } else {
      chatHistory.value.push({ role: 'ai', text: 'Gagal dapet respon: ' + JSON.stringify(data.error) })
    }
  } catch (e) {
    chatHistory.value.push({ role: 'ai', text: 'Error koneksi!' })
  }
  userInput.value = ''
}
</script>

<style scoped>
.ai-widget-container { position: fixed; bottom: 30px; right: 30px; z-index: 99999; }
.ai-floating-btn { width: 50px; height: 50px; }
.ai-chat-window { position: absolute; bottom: 70px; right: 0; width: 300px; }
</style>
