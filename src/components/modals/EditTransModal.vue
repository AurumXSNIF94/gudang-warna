<template>
  <div class="modal fade show d-block backdrop-blur" tabindex="-1" style="z-index: 1080;">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content modern-modal border-0 shadow-lg">
        
        <div class="modal-header border-0 pb-3">
          <h5 class="fw-bold m-0 d-flex align-items-center gap-2" style="color:var(--text-main)">
            <div class="icon-circle bg-warning-subtle text-warning"><i class="fas fa-pencil-alt"></i></div>
            Revisi Transaksi
          </h5>
          <button type="button" class="btn-close btn-close-custom" @click="$emit('close')"></button>
        </div>

        <div class="modal-body p-4 pt-0">
          <div class="mb-3">
            <label class="form-label">Waktu Transaksi</label>
            <input type="datetime-local" class="form-control custom-input fw-bold" v-model="tanggal">
          </div>

          <div class="row g-2 mb-3">
            <div class="col-6">
              <label class="form-label">Tipe</label>
              <select class="form-select custom-input fw-bold" v-model="tipe">
                <option value="MASUK">MASUK</option>
                <option value="KELUAR">KELUAR</option>
                <option value="OPNAME">OPNAME</option>
              </select>
            </div>
            <div class="col-6">
              <label class="form-label">Qty (Kg)</label>
              <input type="number" step="any" class="form-control custom-input fw-bold" v-model="qty">
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label">Blok Lokasi</label>
            <select class="form-select custom-input fw-bold" v-model="blok">
              <option value="">-- Tanpa Lokasi --</option>
              <option v-if="blok && !masterBlok.find(b => b.nama === blok)" :value="blok">
                {{ blok }} (Lokasi Asli)
              </option>
              <option v-for="b in masterBlok" :key="b.id" :value="b.nama">
                {{ b.nama }}
              </option>
            </select>
          </div>

          <div class="mb-4">
            <label class="form-label">Keterangan</label>
            <input type="text" class="form-control custom-input text-uppercase" v-model="keterangan">
          </div>

          <div class="d-flex flex-column gap-3 mt-2">
            <button type="button" class="btn btn-lg fw-bold shadow-sm save-btn"
                    :disabled="saving" @click="simpan">
              <i class="fas fa-save me-2"></i> {{ saving ? 'Menyimpan...' : 'UPDATE TRANSAKSI' }}
            </button>
            <button type="button" class="btn btn-outline-danger fw-bold delete-btn py-2"
                    :disabled="saving" @click="hapus">
              <i class="fas fa-trash-alt me-1"></i> HAPUS TRANSAKSI
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ref as dbRef, update } from 'firebase/database'
import { db } from '../../firebase'
import { activeEditTrans } from '../../composables/useEditTrans'
import { masterBlok } from '../../composables/useBlok'
// 🔥 KITA IMPORT dbStok UNTUK BACA BLOK SAAT INI
import { dbStok, useStok } from '../../composables/useStok' 

const emit = defineEmits(['close', 'saved'])
const { jalankanAudit } = useStok()

const tanggal = ref(''), tipe = ref(''), qty = ref(0), blok = ref(''), keterangan = ref(''), saving = ref(false)

onMounted(() => {
  const trx = activeEditTrans.value
  if (!trx) return
  const d = new Date(trx.tanggal)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  tanggal.value = d.toISOString().slice(0, 16)
  tipe.value = trx.tipe; qty.value = trx.qty; blok.value = trx.blok || ''; keterangan.value = trx.keterangan || ''
})

const simpan = async () => {
  const trx = activeEditTrans.value
  if (!trx) return
  saving.value = true
  
  const itemID = trx.parentId || trx.idUnik 
  const item = dbStok.value.find(x => x.idUnik === itemID)
  
  try {
    const updates = {}

    // ====== LOGIKA MATEMATIKA BLOK (PINTAR) ======
    if (item) {
      let bloks = { ...(item.bloks || {}) }
      const oldQ = parseFloat(trx.qty) || 0
      const oldB = trx.blok || ''
      const newQ = parseFloat(qty.value) || 0
      const newB = blok.value || ''

      // 1. Cabut qty dari blok yang lama
      if (oldB && oldB !== 'Tanpa Lokasi') {
        if (trx.tipe === 'MASUK') bloks[oldB] = (parseFloat(bloks[oldB]) || 0) - oldQ
        else if (trx.tipe === 'KELUAR') bloks[oldB] = (parseFloat(bloks[oldB]) || 0) + oldQ
      }

      // 2. Terapkan qty ke blok yang baru (atau blok yang sama dengan nilai baru)
      if (newB && newB !== 'Tanpa Lokasi') {
        if (tipe.value === 'MASUK') bloks[newB] = (parseFloat(bloks[newB]) || 0) + newQ
        else if (tipe.value === 'KELUAR') bloks[newB] = (parseFloat(bloks[newB]) || 0) - newQ
        else if (tipe.value === 'OPNAME') bloks[newB] = newQ
      }

      // 3. Bersihkan sisa koma dan hapus jika 0
      Object.keys(bloks).forEach(k => {
        bloks[k] = parseFloat(bloks[k].toFixed(2))
        if (bloks[k] <= 0) delete bloks[k]
      })

      updates[`stok_benang/${itemID}/bloks`] = Object.keys(bloks).length ? bloks : null
    }
    // ===============================================

    // Update data di buku riwayat
    updates[`riwayat_transaksi/${itemID}/${trx.trxId}/tanggal`] = new Date(tanggal.value).toISOString()
    updates[`riwayat_transaksi/${itemID}/${trx.trxId}/tipe`] = tipe.value
    updates[`riwayat_transaksi/${itemID}/${trx.trxId}/qty`] = parseFloat(qty.value) || 0
    updates[`riwayat_transaksi/${itemID}/${trx.trxId}/blok`] = blok.value
    updates[`riwayat_transaksi/${itemID}/${trx.trxId}/keterangan`] = keterangan.value.toUpperCase()

    await update(dbRef(db), updates)
    await jalankanAudit()
    
    window.Swal.fire({ icon: 'success', title: 'Tersimpan!', timer: 1500, showConfirmButton: false })
    emit('saved'); emit('close')
  } catch(e) { 
    window.Swal.fire('Error', e.message, 'error') 
  } finally { 
    saving.value = false 
  }
}

const hapus = async () => {
  const trx = activeEditTrans.value
  if (!trx) return
  const result = await window.Swal.fire({ 
    title: 'Hapus Transaksi?', 
    text: 'Data akan hilang permanen!', 
    icon: 'warning', 
    showCancelButton: true, 
    confirmButtonColor: '#dc2626' 
  })
  if (!result.isConfirmed) return
  
  saving.value = true
  const itemID = trx.parentId || trx.idUnik 
  const item = dbStok.value.find(x => x.idUnik === itemID)
  
  try {
    const updates = {}

    // ====== LOGIKA MENGEMBALIKAN BLOK (HAPUS) ======
    if (item) {
      let bloks = { ...(item.bloks || {}) }
      const oldQ = parseFloat(trx.qty) || 0
      const oldB = trx.blok || ''

      if (oldB && oldB !== 'Tanpa Lokasi') {
        if (trx.tipe === 'MASUK') bloks[oldB] = (parseFloat(bloks[oldB]) || 0) - oldQ
        else if (trx.tipe === 'KELUAR') bloks[oldB] = (parseFloat(bloks[oldB]) || 0) + oldQ
      }

      Object.keys(bloks).forEach(k => {
        bloks[k] = parseFloat(bloks[k].toFixed(2))
        if (bloks[k] <= 0) delete bloks[k]
      })

      updates[`stok_benang/${itemID}/bloks`] = Object.keys(bloks).length ? bloks : null
    }
    // ===============================================

    // Menghapus data dari riwayat
    updates[`riwayat_transaksi/${itemID}/${trx.trxId}`] = null
    
    await update(dbRef(db), updates)
    await jalankanAudit()
    
    window.Swal.fire({ icon: 'success', title: 'Dihapus!', timer: 1500, showConfirmButton: false })
    emit('saved'); emit('close')
  } catch(e) { 
    window.Swal.fire('Error', e.message, 'error') 
  } finally { 
    saving.value = false 
  }
}
</script>

<style scoped>
.modern-modal { border-radius: 24px; background: var(--bg-card); }
.backdrop-blur { background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); }
.icon-circle { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.bg-warning-subtle { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
.custom-input { background: var(--bg-main); border: 1px solid var(--border-color); color: var(--text-main); padding: 12px; border-radius: 10px; }
.save-btn { background: #f59e0b; color: #000; border-radius: 12px; }
.delete-btn { border-radius: 12px; border: 1px solid #ef4444; color: #ef4444; }
.delete-btn:hover { background: #ef4444; color: white; }
.btn-close-custom { opacity: 0.5; }
</style>

<style>
.swal2-container { z-index: 9999 !important; }
</style>
