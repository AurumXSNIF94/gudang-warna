<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { ref as dbRef, onValue } from 'firebase/database'
import { db } from '../firebase'
import { dbStok } from '../composables/useStok'
import { activeHistId } from '../composables/useHist'
import { currentRole } from '../composables/useAuth'
import { activeEditTrans } from '../composables/useEditTrans'

const emit = defineEmits(['close'])

const fmt = (n) => Number(n || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const BULAN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
const allLogs = ref({}); 
const activeMonth = ref(''); 
const loadingHist = ref(false); 
let unsubscribe = null

const isAdmin = computed(() => currentRole.value === 'admin')
const activeItem = computed(() => dbStok.value.find(x => x.idUnik === activeHistId.value))
const months = computed(() => Object.keys(allLogs.value).sort((a, b) => b.localeCompare(a)))
const currentLogs = computed(() => (allLogs.value[activeMonth.value] || []))

const totalMasukBulanIni = computed(() => {
  return currentLogs.value
    .filter(r => r.tipe === 'MASUK' || r.tipe === 'RETUR')
    .reduce((sum, r) => sum + (parseFloat(r.qty) || 0), 0)
})

const totalKeluarBulanIni = computed(() => {
  return currentLogs.value
    .filter(r => r.tipe === 'KELUAR')
    .reduce((sum, r) => sum + (parseFloat(r.qty) || 0), 0)
})

const formatMonth = m => { const [y, mo] = m.split('-'); return BULAN[parseInt(mo) - 1] + ' ' + y }
const formatDate = iso => new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
const formatTime = iso => new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

const loadHistoryData = (id) => {
  if (!id) return
  if (unsubscribe) { unsubscribe(); unsubscribe = null }
  
  loadingHist.value = true
  allLogs.value = {}
  activeMonth.value = ''
  
  unsubscribe = onValue(dbRef(db, `riwayat_transaksi/${id}`), snap => {
    loadingHist.value = false
    const data = snap.val() || {}
    
    // 1. Urutkan dari yang PALING BARU ke yang LAMA (Descending)
    const logsDesc = Object.values(data).sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal))
    
    // 2. KEMBALIKAN KE LOGIKA ASLI YANG AMAN: Baca langsung Snapshot Database
    logsDesc.forEach(r => {
      // Baca stokAkhir sejarah, jika undefined anggap 0
      r.calculatedBal = r.stokAkhir !== undefined ? parseFloat(r.stokAkhir) : 0
    })

    // 3. Kelompokkan per bulan
    const grouped = {}
    logsDesc.forEach(r => {
      const key = (r.tanggal || '').slice(0, 7)
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(r)
    })
    
    allLogs.value = grouped
    activeMonth.value = Object.keys(grouped).sort((a,b) => b.localeCompare(a))[0] || ''
  })
}

const bukaEdit = (log) => {
  activeEditTrans.value = { ...log, idUnik: activeItem.value.idUnik, item: activeItem.value }
  emit('close') 
}

const reloadHist = () => {
  if (activeHistId.value) loadHistoryData(activeHistId.value)
}
defineExpose({ reloadHist })

watch(activeHistId, loadHistoryData, { immediate: true })
onUnmounted(() => { if (unsubscribe) unsubscribe() })
</script>
