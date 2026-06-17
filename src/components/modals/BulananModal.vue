<template>
  <div class="modal fade show d-block backdrop-blur" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered modal-xl">
      <div class="modal-content modern-modal border-0 shadow-lg">
        
        <div class="modal-header border-0 pb-3">
          <h5 class="modal-title fw-bold d-flex align-items-center gap-2 m-0" style="color:var(--text-main)">
            <div class="icon-circle bg-primary-subtle text-primary"><i class="fas fa-calendar-alt"></i></div>
            Arus Barang Detail (Harian)
          </h5>
          <button type="button" class="btn-close btn-close-custom" @click="$emit('close')"></button>
        </div>

        <div class="modal-body p-0">
          <div class="table-responsive" style="max-height: 60vh;">
            <table class="table modern-table align-middle mb-0">
              <thead class="sticky-top">
                <tr>
                  <th style="width: 15%;">TANGGAL</th>
                  <th>KETERANGAN</th>
                  <th class="text-end">MASUK</th>
                  <th class="text-end">KELUAR</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, index) in arusDetail" :key="index" :class="row.isSummary ? 'bg-main-dim fw-bold' : ''">
                  <td class="font-monospace" style="color:var(--text-muted)">{{ row.isSummary ? '' : formatDate(row.tanggal) }}</td>
                  <td class="fw-medium" style="color:var(--text-main)">
                    {{ row.keterangan }}
                    <span v-if="row.isSummary" class="badge-soft badge-soft-primary ms-2">TOTAL HARI INI</span>
                  </td>
                  <td class="text-end text-success fw-bold">{{ row.masuk > 0 ? fmt(row.masuk) : '-' }}</td>
                  <td class="text-end text-danger fw-bold">{{ row.keluar > 0 ? fmt(row.keluar) : '-' }}</td>
                </tr>
                <tr v-if="arusDetail.length === 0">
                  <td colspan="4" class="text-center py-4 text-muted">Belum ada riwayat arus barang</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="modal-footer border-0 p-3">
          <button class="btn btn-sm btn-success fw-bold w-100" @click="exportExcel">
            <i class="fas fa-file-excel me-1"></i> Export Excel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ref as dbRef, get } from 'firebase/database'
import { db } from '../../firebase'

const emit = defineEmits(['close'])
const arusDetail = ref([])

const fmt = n => Number(n || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// 🔥 FUNGSI FORMAT TANGGAL YANG KEBAL ERROR
const formatDate = (iso) => {
  if (!iso) return '-'
  const d = new Date(iso)
  // Kalau gagal dikonversi jadi Date, balikin teks aslinya aja biar gak crash
  if (isNaN(d.getTime())) return iso 
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

onMounted(async () => {
  try {
    const snap = await get(dbRef(db, 'riwayat_transaksi'))
    if (!snap.exists()) return
    const all = snap.val() || {}
    
    const groups = {}
    
    Object.values(all).forEach(p => {
      // Lewati kalau item ini gak punya riwayat/kosong
      if (!p || typeof p !== 'object') return 
      
      Object.values(p).forEach(t => {
        // Lewati riwayat yang nggak punya tanggal biar logic gak nyangkut
        if (!t || !t.tanggal) return 

        const d = String(t.tanggal).substring(0, 10)
        const k = (t.keterangan || '-').toUpperCase()
        const key = `${d}_${k}`
        
        if (!groups[key]) groups[key] = { tanggal: d, keterangan: k, masuk: 0, keluar: 0 }
        if (t.tipe === 'MASUK') groups[key].masuk += parseFloat(t.qty) || 0
        if (t.tipe === 'KELUAR') groups[key].keluar += parseFloat(t.qty) || 0
      })
    })

    // 🔥 PENGURUTAN: Tanggal (Terbaru ke Terlama) -> Abjad (A - Z)
    arusDetail.value = Object.values(groups).sort((a, b) => {
      if (b.tanggal > a.tanggal) return 1
      if (b.tanggal < a.tanggal) return -1
      return (a.keterangan || '').localeCompare(b.keterangan || '')
    })
    
  } catch (error) {
    console.error("Gagal menarik data arus barang:", error)
  }
})

const exportExcel = () => {
  try {
    if (!window.XLSX) {
      window.Swal?.fire('Error', 'Library Excel belum termuat', 'error')
      return
    }
    const rows = [['TANGGAL', 'KETERANGAN', 'MASUK', 'KELUAR'], ...arusDetail.value.map(r => [r.tanggal, r.keterangan, r.masuk, r.keluar])]
    const ws = window.XLSX.utils.aoa_to_sheet(rows)
    const wb = window.XLSX.utils.book_new()
    window.XLSX.utils.book_append_sheet(wb, ws, 'ArusHarian')
    window.XLSX.writeFile(wb, 'Arus_Barang_Harian.xlsx')
  } catch (error) {
    console.error("Gagal export excel:", error)
  }
}
</script>

<style scoped>
.modern-modal { border-radius: 24px; background: var(--bg-card); }
.backdrop-blur { background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); }
.icon-circle { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.bg-primary-subtle { background: rgba(79, 70, 229, 0.1); }
.modern-table th { background: var(--bg-main); color: var(--text-muted); font-size: 0.7rem; text-transform: uppercase; padding: 12px; }
.modern-table td { color: var(--text-main); font-size: 0.85rem; padding: 12px; border-bottom: 1px solid var(--border-color); }
.bg-main-dim { background: var(--bg-main); }
.badge-soft { font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; background: rgba(79, 70, 229, 0.1); color: #818cf8; }
.btn-close-custom { opacity: 0.5; }
</style>
