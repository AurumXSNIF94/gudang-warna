<template>
  <div class="modal-backdrop-custom" @click.self="$emit('close')">
    <div class="modal-dialog-custom shadow-lg">
      <div class="modal-content-custom">
        <div class="modal-header-custom border-bottom">
          <h5 class="fw-bold mb-0 text-main">
            <i class="fas fa-users-cog me-2 text-primary"></i> Kelola Admin
          </h5>
          <button type="button" class="btn-close-custom" @click="$emit('close')">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="p-3">
          <div class="d-flex gap-2 mb-3">
            <input v-model="newEmail" type="email" class="form-control fw-bold" placeholder="Masukkan email admin baru..." @keyup.enter="tambahAdmin">
            <button class="btn btn-primary fw-bold px-3" @click="tambahAdmin" :disabled="!newEmail">
              <i class="fas fa-plus"></i>
            </button>
          </div>
          
          <div class="list-group">
            <div v-for="(email, key) in daftarAdmin" :key="key" 
                 class="list-group-item d-flex justify-content-between align-items-center"
                 style="background: var(--bg-main); border-color: var(--border-color); color: var(--text-main);">
              <span class="fw-bold">{{ email }}</span>
              <button class="btn btn-sm btn-outline-danger border-0" title="Hapus Hak Akses" @click="hapusAdmin(key)">
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
            
            <div v-if="Object.keys(daftarAdmin).length === 0" class="text-center p-3 text-muted small fw-bold">
              Belum ada admin yang terdaftar.
            </div>
          </div>
          <div class="text-muted small mt-3" style="font-size: 0.7rem; line-height: 1.2;">
            *User dengan email di atas otomatis akan mendapatkan hak akses Admin saat login.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { ref as dbRef, onValue, push, remove } from 'firebase/database'
import { db } from '../../firebase'

const emit = defineEmits(['close'])
const newEmail = ref('')
const daftarAdmin = ref({})
let unsubscribe = null

onMounted(() => {
  unsubscribe = onValue(dbRef(db, 'daftar_admin'), snap => {
    daftarAdmin.value = snap.val() || {}
  })
})

onUnmounted(() => {
  if (unsubscribe) unsubscribe()
})

const tambahAdmin = async () => {
  const emailVal = newEmail.value.trim().toLowerCase()
  if (!emailVal.includes('@')) {
    return window.Swal.fire('Error', 'Format email tidak valid!', 'error')
  }
  
  // Cek apakah email sudah ada
  const emailList = Object.values(daftarAdmin.value)
  if (emailList.includes(emailVal)) {
    return window.Swal.fire('Info', 'Email ini sudah menjadi admin!', 'info')
  }

  try {
    await push(dbRef(db, 'daftar_admin'), emailVal)
    newEmail.value = ''
    window.Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Admin baru ditambahkan', timer: 1500, showConfirmButton: false })
  } catch (e) {
    window.Swal.fire('Error', e.message, 'error')
  }
}

const hapusAdmin = async (key) => {
  const konfirmasi = await window.Swal.fire({
    title: 'Cabut Hak Akses?',
    text: "User ini tidak akan bisa mengakses menu admin lagi.",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Ya, Cabut!'
  })
  
  if (konfirmasi.isConfirmed) {
    await remove(dbRef(db, `daftar_admin/${key}`))
  }
}
</script>

<style scoped>
.modal-backdrop-custom { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(3px); z-index: 1060; display: flex; align-items: center; justify-content: center; }
.modal-dialog-custom { width: 100%; max-width: 450px; margin: 15px; animation: scaleIn 0.2s ease-out; }
.modal-content-custom { background: var(--bg-card); border-radius: 16px; overflow: hidden; border: 1px solid var(--border-color); }
.modal-header-custom { padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; background: var(--bg-card); }
.btn-close-custom { background: var(--bg-main); border: 1px solid var(--border-color); width: 32px; height: 32px; border-radius: 8px; color: var(--text-muted); display: flex; align-items: center; justify-content: center; }
@keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
</style>
