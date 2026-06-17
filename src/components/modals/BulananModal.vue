<script setup>
import { ref, onMounted } from 'vue'
import { ref as dbRef, get } from 'firebase/database'
import { db } from '../../firebase'

const emit = defineEmits(['close'])
const arusDetail = ref([])

const fmt = n => Number(n || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const formatDate = (iso) => new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

onMounted(async () => {
  try {
    const snap = await get(dbRef(db, 'riwayat_transaksi'))
    const all = snap.val() || {}
    
    // Grouping by Tanggal + Keterangan
    const groups = {}
    
    Object.values(all).forEach(p => {
      // 1. PENGAMAN: Lewati kalau ada blok item yang null/error
      if (!p || typeof p !== 'object') return 
      
      Object.values(p).forEach(t => {
        // 2. PENGAMAN: Lewati kalau ada transaksi tanpa tanggal biar gak crash
        if (!t || !t.tanggal) return 

        const d = String(t.tanggal).slice(0, 10)
        const k = (t.keterangan || '-').toUpperCase()
        const key = `${d}_${k}`
        
        if (!groups[key]) groups[key] = { tanggal: d, keterangan: k, masuk: 0, keluar: 0 }
        if (t.tipe === 'MASUK') groups[key].masuk += parseFloat(t.qty) || 0
        if (t.tipe === 'KELUAR') groups[key].keluar += parseFloat(t.qty) || 0
      })
    })

    // 3. URUTAN YANG LEBIH AMAN: Tanggal (Terbaru) -> Abjad (A-Z)
    arusDetail.value = Object.values(groups).sort((a, b) => {
      // Bandingkan teks tanggalnya langsung (YYYY-MM-DD)
      if (b.tanggal > a.tanggal) return 1
      if (b.tanggal < a.tanggal) return -1
      
      // Kalau tanggal sama, urutkan keterangan A-Z
      return a.keterangan.localeCompare(b.keterangan)
    })
    
  } catch (error) {
    console.error("Error gagal memuat arus:", error)
    window.Swal?.fire('Error', 'Gagal memuat data laporan', 'error')
  }
})

const exportExcel = () => {
  const rows = [['TANGGAL', 'KETERANGAN', 'MASUK', 'KELUAR'], ...arusDetail.value.map(r => [r.tanggal, r.keterangan, r.masuk, r.keluar])]
  const ws = window.XLSX.utils.aoa_to_sheet(rows)
  const wb = window.XLSX.utils.book_new()
  window.XLSX.utils.book_append_sheet(wb, ws, 'ArusHarian')
  window.XLSX.writeFile(wb, 'Arus_Barang_Harian.xlsx')
}
</script>
