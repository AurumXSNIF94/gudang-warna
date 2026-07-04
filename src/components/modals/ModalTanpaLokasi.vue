<template>
  <div class="modal fade show d-block backdrop-blur" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered modal-xl">
      <div class="modal-content modern-modal border-0 shadow-lg">

        <div class="modal-header border-0 pb-3">
          <div class="w-100">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h5 class="modal-title fw-bold d-flex align-items-center gap-2 m-0" style="letter-spacing: -0.5px; color: var(--text-main);">
                <div class="icon-circle bg-warning-subtle text-warning">
                  <i class="fas fa-box-open"></i>
                </div>
                Daftar Stok Tanpa Lokasi
              </h5>
              <button type="button" class="btn-close btn-close-custom" @click="$emit('close')"></button>
            </div>
            
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div class="search-container shadow-sm flex-grow-1" style="max-width: 400px;">
                <div class="search-icon"><i class="fas fa-search"></i></div>
                <input type="text" class="search-input" placeholder="Cari Kode, Nama, Warna..." v-model="searchQuery">
                <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''">
                  <i class="fas fa-times-circle"></i>
                </button>
              </div>

              <button class="btn btn-sm btn-success fw-bold px-3 shadow-sm" style="border-radius: 8px;" @click="exportExcel">
                <i class="fas fa-file-excel me-1"></i> Export Data
              </button>
            </div>
          </div>
        </div>

        <div class="modal-body p-0">
          <div class="table-responsive" style="max-height:60vh; overflow-y:auto;">
            <table class="table modern-table table-hover align-middle mb-0">
              <thead class="sticky-top">
                <tr>
                  <th class="text-center" style="width: 5%">No</th>
                  <th style="width: 25%">Kode ERP</th>
                  <th style="width: 35%">Nama Barang</th>
                  <th style="width: 20%">Warna</th>
                  <th class="text-end" style="width: 15%">Sisa Qty (Kg)</th>
                </tr>
              </thead>
              <tbody>
                <template v-if="filteredData.length">
                  <tr v-for="(item, idx) in filteredData" :key="item.idUnik">
                    <td class="text-center fw-bold text-muted">{{ idx + 1 }}</td>
                    <td class="font-monospace text-primary fw-bold">{{ item.kodeErp }}</td>
                    <td class="fw-bold" style="color: var(--text-main)">{{ item.nama }}</td>
                    <td>{{ item.warna || '-' }}</td>
                    <td class="text-end fw-bold text-warning" style="font-size: 1.1rem; filter: brightness(0.85);">
                      {{ fmt(item.sisaTanpaBlok) }}
                    </td>
                  </tr>
                </template>
                <template v-else>
                  <tr>
                    <td colspan="5" class="text-center py-5 text-muted fw-bold">
                      <i class="fas fa-check-circle text-success fs-2 mb-2 d-block"></i>
                      Semua stok sudah memiliki lokasi blok! (Atau data tidak ditemukan)
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>

        <div class="modal-footer bg-light-modern py-3 border-top d-flex justify-content-between align-items-center">
          <div class="fw-bold" style="color:var(--text-muted)">
            Total Item Mengambang: <span class="text-primary">{{ filteredData.length }} Item</span>
          </div>
          <div class="fw-bold fs-5" style="color:var(--text-main)">
            <span style="font-size:0.8rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;">TOTAL BERAT: </span>
            <span class="text-warning" style="filter: brightness(0.85);">{{ fmt(grandTotal) }}</span> <small style="font-size:60%; opacity:0.8;">Kg</small>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { dbStok } from '../../composables/useStok'

const emit = defineEmits(['close'])
const searchQuery = ref('')

const fmt = n => Number(n || 0).toLocaleString('id-ID', {
  minimumFractionDigits: 2, maximumFractionDigits: 2
})

// 1. Ekstrak hanya data yang tidak ada lokasinya (Total Stok - Stok di Rak)
const daftarTanpaLokasi = computed(() => {
  let items = []
  dbStok.value.forEach(i => {
    const totalStok = parseFloat(i.stok) || 0
    const diBlok = i.bloks ? Object.values(i.bloks).reduce((s, v) => s + parseFloat(v), 0) : 0
    const selisih = totalStok - diBlok
    
    // Jika ada sisa barang yang belum masuk blok
    if (selisih > 0.01) {
      items.push({ 
        idUnik: i.idUnik,
        kodeErp: i.kodeErp || '-',
        nama: i.nama || 'N/A',
        warna: i.warna || '-',
        sisaTanpaBlok: selisih
      })
    }
  })

  // Urutkan berdasarkan Abjad Kode ERP
  items.sort((a, b) => a.kodeErp.localeCompare(b.kodeErp))
  
  return items
})

// 2. Fitur Pencarian (Search Bar)
const filteredData = computed(() => {
  if (!searchQuery.value) return daftarTanpaLokasi.value
  
  const q = searchQuery.value.toLowerCase()
  return daftarTanpaLokasi.value.filter(i => 
    i.nama.toLowerCase().includes(q) || 
    i.kodeErp.toLowerCase().includes(q) || 
    i.warna.toLowerCase().includes(q)
  )
})

// 3. Hitung Grand Total Keseluruhan
const grandTotal = computed(() => {
  return filteredData.value.reduce((sum, item) => sum + item.sisaTanpaBlok, 0)
})

// 4. Export ke Excel
const exportExcel = () => {
  if (!filteredData.value.length) return
  
  const rows = [
    ['LAPORAN STOK TANPA LOKASI (MENGAMBANG)'], 
    [`Tanggal Export: ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')}`],
    [], 
    ['NO', 'KODE ERP', 'NAMA BARANG', 'WARNA', 'QTY TANPA LOKASI (KG)']
  ]
  
  filteredData.value.forEach((item, index) => {
    rows.push([
      index + 1,
      item.kodeErp,
      item.nama,
      item.warna,
      item.sisaTanpaBlok
    ])
  })
  
  // Tambah baris total di bawah excel
  rows.push([])
  rows.push(['', '', '', 'GRAND TOTAL:', grandTotal.value])

  const ws = window.XLSX.utils.aoa_to_sheet(rows)
  const wb = window.XLSX.utils.book_new()
  window.XLSX.utils.book_append_sheet(wb, ws, 'Tanpa_Lokasi')
  window.XLSX.writeFile(wb, `Stok_Tanpa_Lokasi_${new Date().toISOString().slice(0,10)}.xlsx`)
}
</script>

<style scoped>
.modern-modal { border-radius: 24px; background: var(--bg-card); }
.backdrop-blur { background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); }
.icon-circle { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
.bg-warning-subtle { background: rgba(245, 158, 11, 0.15); color: #d97706; }
:global([data-bs-theme="dark"]) .bg-warning-subtle { color: #fbbf24; }

.btn-close-custom { background: transparent url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%2364748b'%3e%3cpath d='M.293.293a1 1 0 0 1 1.414 0L8 6.586 14.293.293a1 1 0 1 1 1.414 1.414L9.414 8l6.293 6.293a1 1 0 0 1-1.414 1.414L8 9.414l-6.293 6.293a1 1 0 0 1-1.414-1.414L6.586 8 .293 1.707a1 1 0 0 1 0-1.414z'/%3e%3c/svg%3e") center/1em auto no-repeat; opacity: 0.5; border: none; width: 32px; height: 32px; cursor: pointer; transition: 0.2s; }
.btn-close-custom:hover { opacity: 1; }

.search-container { display: flex; align-items: center; background: var(--bg-main); border-radius: 10px; padding: 8px 16px; border: 1px solid var(--border-color); transition: all 0.3s ease; }
.search-container:focus-within { border-color: #818cf8; box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1); }
.search-icon { color: var(--text-muted); margin-right: 12px; }
.search-input { flex: 1; border: none; background: transparent; color: var(--text-main); font-weight: 500; outline: none; }
.search-input::placeholder { color: var(--text-muted); opacity: 0.6; }
.clear-btn { background: transparent; border: none; color: var(--text-muted); cursor: pointer; }
.clear-btn:hover { color: #ef4444; }

.modern-table th { background: var(--bg-main); color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; padding: 14px 12px; border-bottom: 2px solid var(--border-color); }
.modern-table td { color: var(--text-main); padding: 12px; border-bottom: 1px solid var(--border-color); }
.bg-light-modern { background: var(--bg-main); }
</style>
