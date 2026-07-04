<template>
  <div class="modal fade show d-block backdrop-blur" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered modal-lg">
      <div class="modal-content modern-modal border-0 shadow-lg">

        <div class="modal-header border-0 pb-3">
          <div class="w-100">
            <div class="d-flex justify-content-between align-items-center">
              <h5 class="modal-title fw-bold d-flex align-items-center gap-2 m-0" style="color: var(--text-main);">
                <div class="icon-circle bg-warning-subtle text-warning">
                  <i class="fas fa-balance-scale"></i>
                </div>
                Cek Selisih & Opname Fisik
              </h5>
              <button type="button" class="btn-close btn-close-custom" @click="$emit('close')"></button>
            </div>
            <p class="text-muted small mt-2 mb-0">Cari barang, masukkan hasil timbangan fisik, lalu sesuaikan stok.</p>
          </div>
        </div>

        <div class="modal-body p-4 pt-2">
          
          <div class="mb-4" style="position: relative;">
            <label class="fw-bold mb-2 section-label text-primary">1. CARI / SCAN BARANG</label>
            <div class="search-container shadow-sm" :class="{'border-primary': assignDrop}">
              <div class="search-icon"><i class="fas fa-search"></i></div>
              <input type="text" class="search-input py-2" 
                     placeholder="Ketik Kode ERP, Nama, atau Warna..." 
                     v-model="searchKey" 
                     @input="onSearchInput"
                     @blur="setTimeout(() => assignDrop = false, 200)">
              <button v-if="searchKey" class="clear-btn" @click="resetForm">
                <i class="fas fa-times-circle"></i>
              </button>
            </div>

            <div v-if="assignDrop && suggestions.length" class="ac-dropdown-new shadow-lg">
              <div v-for="sug in suggestions" :key="sug.idUnik"
                   class="ac-item-new" @mousedown.prevent="pilihItem(sug)">
                <div class="d-flex justify-content-between w-100 mb-1">
                  <span class="fw-bold text-primary font-monospace">{{ sug.kodeErp }}</span>
                  <span class="badge bg-light text-dark border">{{ fmt(sug.stok) }} Kg</span>
                </div>
                <div class="text-muted text-truncate w-100" style="font-size:.8rem">
                  {{ sug.nama }} <span v-if="sug.warna" class="text-indigo fw-bold">- {{ sug.warna }}</span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="selectedItem" class="opname-card p-4 rounded-4 shadow-sm border">
            <div class="d-flex justify-content-between align-items-start border-bottom pb-3 mb-3">
              <div>
                <h5 class="fw-bold mb-1">{{ selectedItem.nama }}</h5>
                <div class="fw-bold text-indigo mb-1" style="font-size: 0.9rem;">{{ selectedItem.warna || 'Tanpa Warna' }}</div>
                <div class="font-monospace text-muted small">{{ selectedItem.kodeErp }}</div>
              </div>
              <span class="badge bg-primary-subtle text-primary fw-bold px-3 py-2 border border-primary-subtle">
                Pilih Lokasi Blok (Opsional)
              </span>
            </div>

            <div class="row g-4 align-items-center">
              <div class="col-4 text-center">
                <div class="text-muted fw-bold small mb-2">STOK SISTEM</div>
                <div class="fs-3 fw-bold" style="color: var(--text-main);">
                  {{ fmt(selectedItem.stok) }} <small class="fs-6 text-muted">Kg</small>
                </div>
              </div>

              <div class="col-4 text-center border-start border-end">
                <div class="text-primary fw-bold small mb-2">TIMBANGAN FISIK</div>
                <div class="input-group input-group-lg mx-auto" style="max-width: 150px;">
                  <input type="number" step="any" 
                         class="form-control text-center fw-bold text-primary border-primary bg-primary-subtle" 
                         v-model="stokFisik"
                         placeholder="0">
                </div>
              </div>

              <div class="col-4 text-center">
                <div class="text-muted fw-bold small mb-2">SELISIH</div>
                <div class="fs-3 fw-bold" :class="selisihWarna">
                  {{ selisihTeks }} <small class="fs-6 opacity-75">Kg</small>
                </div>
              </div>
            </div>

            <div class="mt-4 row align-items-center justify-content-center">
              <div class="col-8">
                <label class="form-label small fw-bold text-muted mb-1">Simpan/Sesuaikan di Blok (Opsional)</label>
                <select class="form-select form-select-sm fw-bold border-secondary bg-light" v-model="blokTarget">
                  <option value="">-- Sesuaikan Global (Tanpa merubah rak) --</option>
                  <option v-for="b in daftarBlokRak" :key="b" :value="b">
                    Blok {{ b }} (Sistem: {{ fmt(selectedItem.bloks?.[b] || 0) }} Kg)
                  </option>
                </select>
              </div>
            </div>

          </div>

          <div v-else class="text-center py-5 rounded-4" style="background: var(--bg-main); border: 2px dashed var(--border-color);">
            <i class="fas fa-boxes text-muted opacity-50 mb-3" style="font-size: 3rem;"></i>
            <h6 class="fw-bold text-muted">Belum ada barang yang dipilih</h6>
            <p class="small text-muted mb-0">Cari barang di atas untuk mulai membandingkan stok fisik.</p>
          </div>

        </div>

        <div class="modal-footer bg-light-modern py-3 border-top d-flex justify-content-end">
          <button class="btn btn-light-action fw-bold px-4 me-2" @click="$emit('close')">Batal</button>
          <button class="btn btn-warning fw-bold px-5 shadow-sm text-dark" 
                  :disabled="!selectedItem || stokFisik === '' || submitting"
                  @click="simpanOpname">
            <i v-if="submitting" class="fas fa-circle-notch fa-spin me-2"></i>
            <i v-else class="fas fa-check-double me-2"></i>
            Sesuaikan Stok Sekarang
          </button>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { dbStok, useStok } from '../../composables/useStok'
import { masterBlok } from '../../composables/useBlok'

const emit = defineEmits(['close'])
const { kirimTransaksi } = useStok()

const searchKey = ref('')
const assignDrop = ref(false)
const suggestions = ref([])
const selectedItem = ref(null)
const stokFisik = ref('')
const blokTarget = ref('')
const submitting = ref(false)

const fmt = n => Number(n || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Daftar blok yang ada di master
const daftarBlokRak = computed(() => masterBlok.value.map(b => b.nama))

// Pencarian Barang
const onSearchInput = () => {
  if (!searchKey.value) {
    assignDrop.value = false
    return
  }
  const q = searchKey.value.toLowerCase()
  suggestions.value = dbStok.value.filter(i => 
    (i.nama || '').toLowerCase().includes(q) || 
    (i.kodeErp || '').toLowerCase().includes(q) || 
    (i.warna || '').toLowerCase().includes(q)
  ).slice(0, 8)
  assignDrop.value = suggestions.value.length > 0
}

const pilihItem = (item) => {
  selectedItem.value = item
  searchKey.value = item.kodeErp
  stokFisik.value = item.stok // Default diisi sama dengan stok sistem
  blokTarget.value = ''
  assignDrop.value = false
}

const resetForm = () => {
  searchKey.value = ''
  selectedItem.value = null
  stokFisik.value = ''
  blokTarget.value = ''
}

// Perhitungan Selisih Real-Time
const angkaSelisih = computed(() => {
  if (!selectedItem.value || stokFisik.value === '') return 0
  let fisik = parseFloat(stokFisik.value) || 0
  let sistem = parseFloat(selectedItem.value.stok) || 0
  
  // Jika dia milih blok spesifik, bandingkannya sama stok di blok itu
  if (blokTarget.value) {
    sistem = parseFloat(selectedItem.value.bloks?.[blokTarget.value] || 0)
  }
  
  return fisik - sistem
})

const selisihWarna = computed(() => {
  const selisih = angkaSelisih.value
  if (selisih > 0) return 'text-success' // Surplus (Hijau)
  if (selisih < 0) return 'text-danger'  // Minus/Hilang (Merah)
  return 'text-muted' // Pas/Sama (Abu-abu)
})

const selisihTeks = computed(() => {
  const selisih = angkaSelisih.value
  if (selisih > 0) return `+${fmt(selisih)}`
  return fmt(selisih)
})

// Simpan Data
const simpanOpname = async () => {
  if (!selectedItem.value || stokFisik.value === '') return
  const fisikAkhir = parseFloat(stokFisik.value)
  
  if (isNaN(fisikAkhir) || fisikAkhir < 0) {
    window.Swal.fire('Error', 'Input fisik tidak valid', 'error')
    return
  }

  // Kalau tidak ada selisih, ngapain disimpan?
  if (angkaSelisih.value === 0) {
    window.Swal.fire('Info', 'Stok sudah sama, tidak ada selisih yang perlu disesuaikan.', 'info')
    return
  }

  const konfirmasi = await window.Swal.fire({
    title: 'Sesuaikan Stok?',
    html: `Stok sistem akan diubah menjadi <b>${fmt(fisikAkhir)} Kg</b><br>Selisih tercatat: <b class="${selisihWarna.value}">${selisihTeks.value} Kg</b>`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Ya, Sesuaikan',
    confirmButtonColor: '#d97706'
  })

  if (!konfirmasi.isConfirmed) return

  submitting.value = true
  try {
    // Tipe transaksi 'OPNAME' otomatis mereplace (menimpa) stok lama dengan stok baru
    await kirimTransaksi(
      selectedItem.value.idUnik, 
      'OPNAME', 
      fisikAkhir, 
      'OPNAME / SELISIH FISIK', 
      blokTarget.value // Lempar nama blok kalau diisi
    )
    window.Swal.fire({ icon: 'success', title: 'Stok Disesuaikan', timer: 1000, showConfirmButton: false })
    emit('close')
  } catch (error) {
    window.Swal.fire('Error', error.message, 'error')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.modern-modal { border-radius: 20px; background: var(--bg-card); overflow: hidden; }
.backdrop-blur { background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); }
.icon-circle { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
.bg-warning-subtle { background: rgba(245, 158, 11, 0.15); color: #d97706; }

.section-label { font-size: 0.75rem; letter-spacing: 0.5px; }

.search-container { display: flex; align-items: center; background: var(--bg-main); border-radius: 12px; padding: 6px 16px; border: 2px solid var(--border-color); transition: all 0.3s ease; }
.search-icon { color: var(--text-muted); margin-right: 12px; }
.search-input { flex: 1; border: none; background: transparent; color: var(--text-main); font-weight: 600; outline: none; }
.clear-btn { background: transparent; border: none; color: var(--text-muted); cursor: pointer; }
.clear-btn:hover { color: #ef4444; }

.ac-dropdown-new { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; z-index: 9999; max-height: 250px; overflow-y: auto; }
.ac-item-new { padding: 10px 16px; cursor: pointer; border-bottom: 1px solid var(--border-color); transition: 0.2s; }
.ac-item-new:hover { background-color: var(--bg-main); }
.text-indigo { color: #6366f1; }

.opname-card { background: var(--bg-card); }
.bg-primary-subtle { background: rgba(79, 70, 229, 0.1) !important; }
.border-primary-subtle { border-color: rgba(79, 70, 229, 0.2) !important; }

.btn-light-action { background: var(--bg-main); color: var(--text-muted); border: 1px solid var(--border-color); border-radius: 10px; }
.btn-light-action:hover { background: var(--border-color); color: var(--text-main); }

.bg-light-modern { background: var(--bg-main); }
</style>
