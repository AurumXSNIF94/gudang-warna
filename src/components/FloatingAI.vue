<template>
  <div class="ai-widget-container">
    <button v-if="!isOpen" @click="toggleChat" class="btn btn-primary rounded-circle shadow-lg ai-floating-btn d-flex align-items-center justify-content-center">
      <i class="fas fa-robot fs-3"></i>
    </button>

    <transition name="slide-up">
      <div v-if="isOpen" class="card shadow-lg ai-chat-window border-0 rounded-4 overflow-hidden">
        <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center p-3 border-0">
          <h6 class="mb-0 fw-bold"><i class="fas fa-robot text-warning me-2"></i> Asisten Gudang</h6>
          <button @click="toggleChat" class="btn-close btn-close-white"></button>
        </div>

        <div class="card-body bg-light ai-chat-body p-3" ref="chatBox">
          <div v-for="(msg, index) in chatHistory" :key="index" class="mb-3 d-flex" :class="msg.role === 'user' ? 'justify-content-end' : 'justify-content-start'">
            <div class="p-2 px-3 rounded-3 shadow-sm text-sm" :class="msg.role === 'user' ? 'bg-primary text-white' : 'bg-white text-dark border'" style="max-width: 85%; white-space: pre-wrap; font-size: 0.9rem;">
              {{ msg.text }}
            </div>
          </div>
        </div>

        <div class="card-footer bg-white p-2">
          <div class="input-group">
            <input type="text" class="form-control border-0 bg-light rounded-pill px-3" v-model="userInput" @keyup.enter="kirimPertanyaan" placeholder="Tanya stok/lokasi..." :disabled="loading">
            <button class="btn btn-primary rounded-circle ms-2" @click="kirimPertanyaan" :disabled="loading || !userInput.trim()"><i class="fas fa-paper-plane"></i></button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { ref as dbRef, get } from 'firebase/database'
import { db } from '../firebase' 
import { dbStok } from '../composables/useStok' 

const API_KEY = 'MASUKKAN_KUNCI_BARU_DI_SINI'.trim()
const isOpen = ref(false)
const userInput = ref('')
const loading = ref(false)
const chatBox = ref(null)
const chatHistory = ref([{ role: 'ai', text: 'Halo Bos, ada yang bisa dibantu hari ini?' }])

const toggleChat = () => { isOpen.value = !isOpen.value; nextTick(() => chatBox.value?.scrollTo(0, chatBox.value.scrollHeight)) }

const kirimPertanyaan = async () => {
  if (!userInput.value.trim()) return
  const pesan = userInput.value
  chatHistory.value.push({ role: 'user', text: pesan })
  userInput.value = ''
  loading.value = true

  try {
    const dataStok = dbStok.value.map(i => ({ id: i.idUnik, stok: i.stok }))
    const systemPrompt = `Anda asisten gudang. Data stok: ${JSON.stringify(dataStok)}. Pertanyaan: "${pesan}"`

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt }] }] })
    })

    const result = await response.json()
    console.log("DEBUG RESPONSE:", result)

    if (!response.ok) throw new Error(result.error?.message || "Gagal menghubungi AI")
    
    if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
      chatHistory.value.push({ role: 'ai', text: result.candidates[0].content.parts[0].text })
    } else {
      throw new Error("AI tidak memberikan jawaban")
    }
  } catch (error) {
    console.error("ERROR =", error)
    chatHistory.value.push({ role: 'ai', text: 'Error: ' + error.message })
  } finally {
    loading.value = false
    nextTick(() => chatBox.value?.scrollTo(0, chatBox.value.scrollHeight))
  }
}
</script>
