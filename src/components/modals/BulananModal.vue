<script setup>
import { ref, onMounted } from 'vue'
import { ref as dbRef, get } from 'firebase/database'
import { db } from '../../firebase'

const emit = defineEmits(['close'])
const arusDetail = ref([])

const fmt = n => Number(n || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const formatDate = (iso) => new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

onMounted(async () => {
  const snap = await get(dbRef(db, 'riwayat_transaksi'))
  const all = snap.val() || {}
  
  // Grouping by Tanggal + Keterangan
  const groups = {}
  Object.values(all).forEach(p => Object.values(p).forEach(t => {
    const d = t.tanggal.slice(0, 10)
    const k = (t.keterangan || '-').toUpperCase()
    const key = `${d}_${k}`
    if (!groups[key]) groups[key] = { tanggal: d, keterangan: k, masuk: 0, keluar: 0 }
    if (t.tipe === 'MASUK') groups[key].masuk += parseFloat(t.qty) || 0
    if (t.tipe === 'KELUAR') groups[key].keluar += parseFloat(t.qty) || 0
  }))

  // 🔥 UPDATE URUTAN DI SINI: Tanggal (Terbaru) -> Abjad Keterangan (A-Z)
  arusDetail.value = Object.values(groups).sort((a, b) => {
    // 1. Cek selisih tanggal dulu
    const dateA = new Date(a.tanggal)
    const dateB = new Date(b.tanggal)
    
    if (dateB > dateA) return 1   // B lebih baru, taruh atas
    if (dateB < dateA) return -1  // A lebih baru, taruh atas
    
    // 2. Jika tanggalnya SAMA, urutkan Keterangan sesuai Abjad (A-Z)
    return a.keterangan.localeCompare(b.keterangan)
  })
})

const exportExcel = () => {
  const rows = [['TANGGAL', 'KETERANGAN', 'MASUK', 'KELUAR'], ...arusDetail.value.map(r => [r.tanggal, r.keterangan, r.masuk, r.keluar])]
  const ws = window.XLSX.utils.aoa_to_sheet(rows)
  const wb = window.XLSX.utils.book_new()
  window.XLSX.utils.book_append_sheet(wb, ws, 'ArusHarian')
  window.XLSX.writeFile(wb, 'Arus_Barang_Harian.xlsx')
}
</script>
