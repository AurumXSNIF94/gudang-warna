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

          <div class="d-grid gap-2">
            <button type="button" class="btn btn-lg fw-bold shadow-sm save-btn"
                    :disabled="saving" @click="simpan">
              <i class="fas fa-save me-2"></i> {{ saving ? 'Menyimpan...' : 'UPDATE TRANSAKSI' }}
            </button>
            <button type="button" class="btn btn-outline-danger fw-bold delete-btn"
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
import { ref as dbRef, update, remove, get } from 'firebase/database'
import { db } from '../../firebase'
import { activeEditTrans } from '../../composables/useEditTrans'
import { masterBlok } from '../../composables/useBlok'

const emit = defineEmits(['close', 'saved'])

const tanggal = ref(''), tipe = ref(''), qty = ref(0), blok = ref(''), keterangan = ref(''), saving = ref(false)

onMounted(() => {
  const trx = activeEditTrans.value
  if (!trx) return
  if (trx.tanggal) {
    const d = new Date(trx.tanggal)
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    tanggal.value = d.toISOString().slice(0, 16)
  }
  tipe.value = trx.tipe; qty.value = trx.qty; blok.value = trx.blok || ''; keterangan.value = trx.keterangan || ''
})

// =====================================================================
// ENGINE REKALKULASI (MENGURUTKAN ULANG BUKU BESAR SUPAYA 100% AKURAT)
// =====================================================================
const recalcItemHistory = async (itemID) => {
  const snap = await get(dbRef(db, `riwayat_transaksi/${itemID}`))
  const logsObj = snap.val() || {}
  const logs = Object.values(logsObj)

  // 1. Urutkan riwayat dari yang paling TUA ke yang BARU
  logs.sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal))

  let currentStok = 0
  let currentBloks = {}
  const updates = {}

  // 2. Hitung ulang running balance satu per satu layaknya buku tabungan
  for (const l of logs) {
    const q = parseFloat(l.qty) || 0
    const b = l.blok || ''

    if (l.tipe === 'MASUK') {
      currentStok += q
      if (b && b !== 'Tanpa Lokasi') currentBloks[b] = (parseFloat(currentBloks[b]) || 0) + q
    } else if (l.tipe === 'KELUAR') {
      currentStok -= q
      if (b && b !== 'Tanpa Lokasi') currentBloks[b] = (parseFloat(currentBloks[b]) || 0) - q
    } else if (l.tipe === 'OPNAME') {
      if (b && b !== 'Tanpa Lokasi') {
        const lama = parseFloat(currentBloks[b]) || 0
        const selisih = q - lama
        currentStok += selisih
        currentBloks[b] = q
      } else {
        currentStok = q
      }
    } else if (l.tipe === 'MUTASI') {
      if (b.includes('->')) {
        const [asal, tujuan] = b.split('->').map(s => s.trim())
        if (asal !== 'Tanpa Lokasi') currentBloks[asal] = (parseFloat(currentBloks[asal]) || 0) - q
        if (tujuan !== 'Tanpa Lokasi') currentBloks[tujuan] = (parseFloat(currentBloks[tujuan]) || 0) + q
      }
    }

    // Bersihkan blok yang minus atau nol
    for (const k in currentBloks) {
      if (currentBloks[k] < 0.001) delete currentBloks[k]
    }

    // 3. Catat stokAkhir yang akurat ke setiap baris riwayat
    l.stokAkhir = parseFloat(currentStok.toFixed(2))
    updates[`riwayat_transaksi/${itemID}/${l.trxId}/stokAkhir`] = l.stokAkhir
  }

  currentStok = parseFloat(currentStok.toFixed(2))
  for (const k in currentBloks) {
    currentBloks[k] = parseFloat(currentBloks[k].toFixed(2))
    if (currentBloks[k] <= 0) delete currentBloks[k]
  }

  // 4. Update data stok utama
  updates[`stok_benang/${itemID}/stok`] = currentStok
  updates[`stok_benang/${itemID}/bloks`] = Object.keys(currentBloks).length ? currentBloks : null

  await update(dbRef(db), updates)
}
// =====================================================================

const simpan = async () => {
  const trx = activeEditTrans.value
  if (!trx) return
  
  if (!tanggal.value) {
    window.Swal.fire('Error', 'Tanggal tidak boleh kosong', 'warning')
    return
  }

  if (trx.tipe === 'OPNAME' || trx.tipe === 'MUTASI' || tipe.value === 'OPNAME') {
    window.Swal.fire('Perhatian', 'Nilai / Tipe pada transaksi OPNAME dan MUTASI tidak bisa direvisi. Silakan HAPUS transaksi ini lalu buat yang baru.', 'warning')
    return
  }

  saving.value = true
  const itemID = trx.parentId || trx.idUnik 

  try {
    const updates = {}
    const isoDate = new Date(tanggal.value).toISOString()
    
    // 1. Simpan perubahan ke baris riwayat ini saja
    updates[`riwayat_transaksi/${itemID}/${trx.trxId}/tanggal`] = isoDate
    updates[`riwayat_transaksi/${itemID}/${trx.trxId}/tipe`] = tipe.value
    updates[`riwayat_transaksi/${itemID}/${trx.trxId}/qty`] = parseFloat(qty.value) || 0
    updates[`riwayat_transaksi/${itemID}/${trx.trxId}/blok`] = blok.value
    updates[`riwayat_transaksi/${itemID}/${trx.trxId}/keterangan`] = keterangan.value.toUpperCase()

    await update(dbRef(db), updates)
    
    // 2. Jalankan engine rekalkulasi agar saldo ke depan otomatis sinkron & benar
    await recalcItemHistory(itemID)

    window.Swal.fire({ icon: 'success', title: 'Tersimpan & Terekalkulasi!', timer: 1500, showConfirmButton: false })
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
    title: 'Yakin Hapus Transaksi?', 
    text: 'Aman. Saldo akan otomatis disesuaikan.', 
    icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc2626' 
  })
  if (!result.isConfirmed) return
  
  saving.value = true
  const itemID = trx.parentId || trx.idUnik 
  
  try {
    // 1. Cabut/Hapus riwayat dari database
    await remove(dbRef(db, `riwayat_transaksi/${itemID}/${trx.trxId}`))
    
    // 2. Jalankan engine rekalkulasi
    await recalcItemHistory(itemID)

    window.Swal.fire({ icon: 'success', title: 'Berhasil Dihapus!', timer: 1500, showConfirmButton: false })
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
.delete-btn { border-radius: 12px; border: none; color: #ef4444; }
.btn-close-custom { opacity: 0.5; }
</style>
