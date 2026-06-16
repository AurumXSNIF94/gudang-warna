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
                <option value="RETUR">RETUR</option>
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
import { ref as dbRef, update, get } from 'firebase/database'
import { db } from '../../firebase'
import { activeEditTrans } from '../../composables/useEditTrans'
import { masterBlok } from '../../composables/useBlok'

const emit = defineEmits(['close', 'saved'])

const tanggal = ref(''), tipe = ref(''), qty = ref(0), blok = ref(''), keterangan = ref(''), saving = ref(false)

onMounted(() => {
  const trx = activeEditTrans.value
  if (!trx) return
  const d = new Date(trx.tanggal)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  tanggal.value = d.toISOString().slice(0, 16)
  tipe.value = trx.tipe; qty.value = trx.qty; blok.value = trx.blok || ''; keterangan.value = trx.keterangan || ''
})

// FUNGSI MATEMATIKA BERSIH: Untuk membatalkan transaksi lama
const cabutEfekLama = (t, q, b, stok, bloks) => {
  if (t === 'MASUK' || t === 'RETUR') {
    stok -= q; if (b) bloks[b] = (parseFloat(bloks[b]) || 0) - q;
  } else if (t === 'KELUAR') {
    stok += q; if (b) bloks[b] = (parseFloat(bloks[b]) || 0) + q;
  }
  return stok;
}

// FUNGSI MATEMATIKA BERSIH: Untuk menerapkan transaksi baru
const terapEfekBaru = (t, q, b, stok, bloks) => {
  if (t === 'MASUK' || t === 'RETUR') {
    stok += q; if (b) bloks[b] = (parseFloat(bloks[b]) || 0) + q;
  } else if (t === 'KELUAR') {
    stok -= q; if (b) bloks[b] = (parseFloat(bloks[b]) || 0) - q;
  }
  return stok;
}

const simpan = async () => {
  const trx = activeEditTrans.value
  if (!trx) return
  
  if (trx.tipe === 'OPNAME' || tipe.value === 'OPNAME') {
    window.Swal.fire('Perhatian', 'Transaksi OPNAME tidak bisa direvisi angkanya. Silakan HAPUS transaksi ini, lalu buat Opname baru yang benar.', 'warning')
    return
  }

  saving.value = true
  const itemID = trx.parentId || trx.idUnik 
  const qBaru = parseFloat(qty.value) || 0
  const qLama = parseFloat(trx.qty) || 0

  try {
    const snap = await get(dbRef(db, `stok_benang/${itemID}`))
    let itemData = snap.val() || { stok: 0, bloks: {} }
    let currentStok = parseFloat(itemData.stok) || 0
    let bloks = itemData.bloks || {}

    // Cabut angka lama, masukkan angka baru
    currentStok = cabutEfekLama(trx.tipe, qLama, trx.blok, currentStok, bloks)
    currentStok = terapEfekBaru(tipe.value, qBaru, blok.value, currentStok, bloks)

    // Bersihkan koma dan blok kosong
    for (let k in bloks) {
      bloks[k] = parseFloat(bloks[k].toFixed(2))
      if (bloks[k] <= 0) delete bloks[k]
    }
    currentStok = parseFloat(currentStok.toFixed(2))

    const updates = {}
    updates[`stok_benang/${itemID}/stok`] = currentStok
    updates[`stok_benang/${itemID}/bloks`] = Object.keys(bloks).length ? bloks : null
    
    updates[`riwayat_transaksi/${itemID}/${trx.trxId}`] = {
      ...trx,
      tanggal: new Date(tanggal.value).toISOString(),
      tipe: tipe.value,
      qty: qBaru,
      blok: blok.value,
      keterangan: keterangan.value.toUpperCase()
      // Kita HAPUS update stokAkhir di sini agar dihitung otomatis oleh HistDrawer!
    }

    await update(dbRef(db), updates)
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
    text: 'Stok akan dikembalikan ke sebelum transaksi ini terjadi!', 
    icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc2626' 
  })
  if (!result.isConfirmed) return
  
  saving.value = true
  const itemID = trx.parentId || trx.idUnik 
  const qLama = parseFloat(trx.qty) || 0
  
  try {
    const snap = await get(dbRef(db, `stok_benang/${itemID}`))
    let itemData = snap.val() || { stok: 0, bloks: {} }
    let currentStok = parseFloat(itemData.stok) || 0
    let bloks = itemData.bloks || {}

    // Batalkan efek transaksi yang dihapus
    if (trx.tipe !== 'OPNAME') {
      currentStok = cabutEfekLama(trx.tipe, qLama, trx.blok, currentStok, bloks)
    }

    for (let k in bloks) {
      bloks[k] = parseFloat(bloks[k].toFixed(2))
      if (bloks[k] <= 0) delete bloks[k]
    }
    currentStok = parseFloat(currentStok.toFixed(2))

    const updates = {}
    updates[`stok_benang/${itemID}/stok`] = currentStok
    updates[`stok_benang/${itemID}/bloks`] = Object.keys(bloks).length ? bloks : null
    updates[`riwayat_transaksi/${itemID}/${trx.trxId}`] = null // Ini yang menghapus datanya

    await update(dbRef(db), updates)
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
.delete-btn { border-radius: 12px; border: none; color: #ef4444; }
.btn-close-custom { opacity: 0.5; }
</style>
