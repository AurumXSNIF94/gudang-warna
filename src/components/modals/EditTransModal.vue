<template>
  <div class="modal fade show d-block backdrop-blur" tabindex="-1">
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
import { ref as dbRef, update, remove } from 'firebase/database'
import { db } from '../../firebase'
import { activeEditTrans } from '../../composables/useEditTrans'
import { masterBlok } from '../../composables/useBlok'
import { useStok } from '../../composables/useStok' 

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
  
  // PERBAIKAN: Membaca fallback idUnik dari HistDrawer jika parentId kosong
  const itemID = trx.parentId || trx.idUnik 
  
  try {
    await update(dbRef(db, `riwayat_transaksi/${itemID}/${trx.trxId}`), {
      tanggal: new Date(tanggal.value).toISOString(),
      tipe: tipe.value,
      qty: parseFloat(qty.value) || 0,
      blok: blok.value,
      keterangan: keterangan.value.toUpperCase()
    })
    
    // Sinkronisasi data utama menggunakan fitur Audit Global Harmonis
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
  
  // PERBAIKAN: Membaca fallback idUnik dari HistDrawer jika parentId kosong
  const itemID = trx.parentId || trx.idUnik 
  
  try {
    await remove(dbRef(db, `riwayat_transaksi/${itemID}/${trx.trxId}`))
    
    // Sinkronisasi data utama menggunakan fitur Audit Global Harmonis
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
.delete-btn { border-radius: 12px; border: none; color: #ef4444; }
.btn-close-custom { opacity: 0.5; }
</style>
