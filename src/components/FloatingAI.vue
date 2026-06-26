<template>
  <div class="ai-widget-container">
    <!-- Tombol Robot Melayang -->
    <button 
      v-if="!isOpen" 
      @click="toggleChat" 
      class="btn btn-primary rounded-circle shadow-lg ai-floating-btn d-flex align-items-center justify-content-center"
      title="Tanya Asisten AI"
    >
      <i class="fas fa-robot fs-3"></i>
    </button>

    <!-- Jendela Chat Pop-Up -->
    <transition name="slide-up">
      <div v-if="isOpen" class="card shadow-lg ai-chat-window border-0 rounded-4 overflow-hidden">
        <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center p-3 border-0">
          <div class="d-flex align-items-center">
            <i class="fas fa-robot text-warning me-2 fs-5"></i>
            <h6 class="mb-0 fw-bold">Asisten Gudang Warna</h6>
          </div>
          <button @click="toggleChat" class="btn-close btn-close-white" aria-label="Close"></button>
        </div>

        <div class="card-body bg-light ai-chat-body p-3" ref="chatBox">
          <div v-for="(msg, index) in chatHistory" :key="index" class="mb-3 d-flex" :class="msg.role === 'user' ? 'justify-content-end' : 'justify-content-start'">
            <div class="p-2 px-3 rounded-3 shadow-sm text-sm" :class="msg.role === 'user' ? 'bg-primary text-white text-end' : 'bg-white text-dark border'" style="max-width: 85%; white-space: pre-wrap; font-size: 0.9rem;">
              <strong>{{ msg.role === 'user' ? 'Bos:' : '🤖 AI:' }}</strong><br>
              {{ msg.text }}
            </div>
          </div>
          <div v-if="loading" class="text-start mb-3 d-flex justify-content-start">
            <div class="p-2 px-3 rounded-3 bg-white text-muted border shadow-sm" style="font-size: 0.85rem;">
              <i class="fas fa-circle-notch fa-spin me-1"></i> <em>Menganalisa...</em>
            </div>
          </div>
        </div>

        <div class="card-footer bg-white border-top p-2">
          <div class="input-group">
            <input type="text" class="form-control border-0 shadow-none bg-light rounded-pill px-3" v-model="userInput" @keyup.enter="kirimPertanyaan" placeholder="Tanya stok/masalah..." :disabled="loading">
            <button class="btn btn-primary rounded-circle ms-2 shadow-sm d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;" @click="kirimPertanyaan" :disabled="loading || !userInput.trim()">
              <i class="fas fa-paper-plane"></i>
            </button>
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
import { dbStok, itemVelocity } from '../composables/useStok' 

// MASUKKAN API KEY BARU ANDA DI SINI (Pastikan format AIza...)
const API_KEY = 'AQ.Ab8RN6KW8OeCxk6RuTEyjpNBgBKdwPGjwuKg7vM63wvqgKYigA'.trim() 

const isOpen = ref(false)
const userInput = ref('')
const loading = ref(false)
const chatBox = ref(null)

const chatHistory = ref([{ role: 'ai', text: 'Halo Bos! Ada yang bisa saya bantu di gudang hari ini?' }])

const toggleChat = () => { isOpen.value = !isOpen.value; if (isOpen.value) scrollToBottom() }
const scrollToBottom = async () => { await nextTick(); if (chatBox.value) chatBox.value.scrollTop = chatBox.value.scrollHeight }

const kirimPertanyaan = async () => {
  if (!userInput.value.trim()) return
  const pesan = userInput.value
  chatHistory.value.push({ role: 'user', text: pesan })
  userInput.value = ''
  loading.value = true
  scrollToBottom()

  try {
    const snapH = await get(dbRef(db, 'riwayat_transaksi'))
    const allHistories = snapH.val() || {}
    let riwayatFlat = []
    Object.keys(allHistories).forEach(idUnik => {
      Object.values(allHistories[idUnik]).forEach(trx => riwayatFlat.push({ id_barang: idUnik, ...trx }))
    })
    riwayatFlat.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal))

    const kataKunciBos = pesan.toUpperCase().split(' ').filter(k => k.length > 2)
    let riwayatUntukAI = riwayatFlat.filter(r => kataKunciBos.some(k => r.id_barang.toUpperCase().includes(k))).slice(0, 50)
    if(riwayatUntukAI.length === 0) riwayatUntukAI = riwayatFlat.slice(0, 50)

    const dataStok = dbStok.value.map(item => ({
      id: item.idUnik,
      stok: item.stok,
      rak: item.bloks ? Object.keys(item.bloks).join(', ') : 'Kosong'
    }))

    const systemPrompt = `Anda adalah Asisten Gudang. Data Stok: ${JSON.stringify(dataStok)}. Riwayat: ${JSON.stringify(riwayatUntukAI)}. Jawab singkat & solutif. Panggil "Bos". Pertanyaan: "${pesan}"`

    // Menggunakan model Flash-8B (Light)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-8b:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt }] }] })
    })

    if (!response.ok) throw new Error("API Error")
    const result = await response.json()
    chatHistory.value.push({ role: 'ai', text: result.candidates[0].content.parts[0].text })
  } catch (error) {
    chatHistory.value.push({ role: 'ai', text: 'Maaf Bos, jaringan/API lagi kendala.' })
  } finally {
    loading.value = false
    scrollToBottom()
  }
}
</script>

<style scoped>
.ai-widget-container { position: fixed; bottom: 25px; right: 25px; z-index: 9999; }
.ai-floating-btn { width: 60px; height: 60px; transition: 0.2s; }
.ai-floating-btn:hover { transform: scale(1.1); }
.ai-chat-window { width: 350px; height: 500px; display: flex; flex-direction: column; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
.ai-chat-body { flex: 1; overflow-y: auto; }
</style>
