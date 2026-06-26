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
        
        <!-- Header Chat -->
        <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center p-3 border-0">
          <div class="d-flex align-items-center">
            <i class="fas fa-robot text-warning me-2 fs-5"></i>
            <h6 class="mb-0 fw-bold">Asisten Gudang AI</h6>
          </div>
          <button @click="toggleChat" class="btn-close btn-close-white" aria-label="Close"></button>
        </div>

        <!-- Body / Area Percakapan -->
        <div class="card-body bg-light ai-chat-body p-3" ref="chatBox">
          <div v-for="(msg, index) in chatHistory" :key="index" class="mb-3 d-flex" :class="msg.role === 'user' ? 'justify-content-end' : 'justify-content-start'">
            <div 
              class="p-2 px-3 rounded-3 shadow-sm text-sm" 
              :class="msg.role === 'user' ? 'bg-primary text-white text-end' : 'bg-white text-dark border'"
              style="max-width: 85%; white-space: pre-wrap; font-size: 0.9rem;"
            >
              <strong>{{ msg.role === 'user' ? 'Bos:' : '🤖 AI:' }}</strong><br>
              {{ msg.text }}
            </div>
          </div>
          
          <!-- Indikator Loading -->
          <div v-if="loading" class="text-start mb-3 d-flex justify-content-start">
            <div class="p-2 px-3 rounded-3 bg-white text-muted border shadow-sm" style="font-size: 0.85rem;">
              <i class="fas fa-circle-notch fa-spin me-1"></i> <em>Menganalisa data gudang...</em>
            </div>
          </div>
        </div>

        <!-- Footer / Input Text -->
        <div class="card-footer bg-white border-top p-2">
          <div class="input-group">
            <input 
              type="text" 
              class="form-control border-0 shadow-none bg-light rounded-pill px-3" 
              v-model="userInput" 
              @keyup.enter="kirimPertanyaan" 
              placeholder="Tanya soal Warna, Lot, Riwayat..." 
              :disabled="loading"
            >
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

// Sesuaikan path import ini dengan struktur folder lu!
import { db } from '../firebase' 
import { dbStok, itemVelocity } from '../composables/useStok' 

// 🔥 MASUKKAN API KEY GEMINI LU DI SINI
const API_KEY = 'AIzaSyC1wDA4eyiZqPet4LYKN_2ULjGswWvV3l0' 

const isOpen = ref(false)
const userInput = ref('')
const loading = ref(false)
const chatBox = ref(null)

const chatHistory = ref([
  { role: 'ai', text: 'Halo Bos! Ada Lot yang mau dicek atau riwayat yang mau diinvestigasi hari ini?' }
])

const toggleChat = () => {
  isOpen.value = !isOpen.value
  if (isOpen.value) scrollToBottom()
}

const scrollToBottom = async () => {
  await nextTick()
  if (chatBox.value) {
    chatBox.value.scrollTop = chatBox.value.scrollHeight
  }
}

const kirimPertanyaan = async () => {
  if (!userInput.value.trim()) return

  const pesan = userInput.value
  chatHistory.value.push({ role: 'user', text: pesan })
  userInput.value = ''
  loading.value = true
  scrollToBottom()

  try {
    // 1. AMBIL DATA RIWAYAT TRANSAKSI
    const snapH = await get(dbRef(db, 'riwayat_transaksi'))
    const allHistories = snapH.val() || {}
    let riwayatFlat = []

    Object.keys(allHistories).forEach(idUnik => {
      Object.values(allHistories[idUnik]).forEach(trx => {
        riwayatFlat.push({ id_barang: idUnik, ...trx })
      })
    })

    riwayatFlat.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal))

    // Logika "Detektif": Filter berdasarkan kata kunci dari Bos
    const kataKunciBos = pesan.toUpperCase().split(' ').filter(k => k.length > 2)
    let riwayatRelevan = riwayatFlat.filter(r => {
      return kataKunciBos.some(kata => r.id_barang.toUpperCase().includes(kata))
    })

    let riwayatUntukAI = riwayatRelevan.length > 0 ? riwayatRelevan : riwayatFlat
    riwayatUntukAI = riwayatUntukAI.slice(0, 100).map(r => ({
      tgl: new Date(r.tanggal).toLocaleDateString('id-ID'),
      id: r.id_barang,
      tipe: r.tipe,
      qty: r.qty,
      lokasi: r.blok || 'Tanpa Lokasi',
      ket: r.keterangan || '-'
    }))

    // 2. SIAPKAN DATA STOK SAAT INI (Pecah ID Gabungan)
    const dataStok = dbStok.value.map(item => {
      const bagian = String(item.idUnik).split('_')
      const jenis = bagian[0] || item.idUnik
      const warna = bagian[1] || '-'
      const lot = bagian[2] || '-'
      const namaBlok = item.bloks ? Object.keys(item.bloks).map(k => `${k} (${item.bloks[k]}Kg)`).join(', ') : 'Kosong'
      
      return {
        jenis: jenis,
        warna: warna,
        lot: lot,
        stok: item.stok,
        status: itemVelocity.value[item.idUnik] || 'AMAN',
        rak: namaBlok
      }
    })

    // 3. RAKIT PROMPT SYSTEM
    const systemPrompt = `
      Anda adalah Asisten Kepala Gudang. Analisa data berikut dan jawab dengan singkat, santai, dan solutif.
      
      Data Stok Saat Ini (Jenis, Warna, Lot, Stok, Status, Rak):
      ${JSON.stringify(dataStok)}
      
      Data 100 Transaksi Relevan (Untuk mencari anomali/selisih):
      ${JSON.stringify(riwayatUntukAI)}
      
      Aturan:
      1. Jika ditanya letak/stok, cek "Data Stok Saat Ini".
      2. Jika barang kosong, sarankan substitusi warna yang sama dari jenis material lain, atau jenis sama beda Lot.
      3. Jika ditanya kenapa selisih/hilang, periksa "Data Transaksi" apakah ada mutasi keluar tanpa masuk, atau ada riwayat dihapus.
      4. Panggil user dengan sebutan "Bos".
      
      Pertanyaan Bos: "${pesan}"
    `

    // 4. TEMBAK KE API GEMINI
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: { temperature: 0.1 }
      })
    })

    if (!response.ok) throw new Error("Gagal terhubung ke API")

    const result = await response.json()
    let balasanAI = result.candidates[0].content.parts[0].text
    
    chatHistory.value.push({ role: 'ai', text: balasanAI })

  } catch (error) {
    console.error("Error AI:", error)
    chatHistory.value.push({ role: 'ai', text: 'Maaf Bos, jaringan lagi gangguan atau API limit. Coba lagi ya!' })
  } finally {
    loading.value = false
    scrollToBottom()
  }
}
</script>

<style scoped>
.ai-widget-container {
  position: fixed;
  bottom: 25px;
  right: 25px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.ai-floating-btn {
  width: 60px;
  height: 60px;
  transition: transform 0.2s ease-in-out;
}
.ai-floating-btn:hover {
  transform: scale(1.1);
}
.ai-chat-window {
  width: 350px;
  height: 500px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}
.ai-chat-body {
  flex: 1;
  overflow-y: auto;
}
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease-out;
}
.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
@media (max-width: 480px) {
  .ai-chat-window {
    width: 90vw;
    height: 60vh;
    bottom: 80px;
    right: 15px;
    position: fixed;
  }
  .ai-widget-container {
    bottom: 15px;
    right: 15px;
  }
}
</style>
