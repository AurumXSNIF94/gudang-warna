<template>
  <div class="hist-wrapper">
    <div class="hist-overlay" @click="$emit('close')"></div>

    <div class="hist-drawer shadow-lg">
      <div class="drawer-header">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <div style="min-width:0; flex:1;">
            <h5 class="fw-bold m-0 text-main text-truncate">{{ activeItem?.nama || 'Riwayat' }}</h5>
            <div class="d-flex align-items-center gap-2 mt-1">
              <span class="small text-muted font-monospace">{{ activeItem?.kodeErp }}</span>
              <span class="stok-tag">Stok: {{ fmt(activeItem?.stok) }} Kg</span>
            </div>
          </div>
          <button type="button" class="btn-close-custom" @click="$emit('close')">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>

      <div class="chips-container">
        <div class="chips-scroll">
          <span v-for="m in months" :key="m"
                :class="['hist-chip', m === activeMonth ? 'active' : '']"
                @click.stop="activeMonth = m">
            {{ formatMonth(m) }}
          </span>
        </div>
      </div>

      <div v-if="currentLogs.length" class="px-3 pt-2">
        <div class="summary-box d-flex justify-content-between align-items-center shadow-sm">
          <div class="text-center flex-fill border-end border-light">
            <span class="d-block" style="font-size: 0.65rem; font-weight: 800; color: var(--text-muted);">TOTAL IN</span>
            <span class="fw-bold text-success" style="font-size: 0.9rem;">+{{ fmt(totalMasukBulanIni) }}</span>
          </div>
          <div class="text-center flex-fill">
            <span class="d-block" style="font-size: 0.65rem; font-weight: 800; color: var(--text-muted);">TOTAL OUT</span>
            <span class="fw-bold text-danger" style="font-size: 0.9rem;">-{{ fmt(totalKeluarBulanIni) }}</span>
          </div>
        </div>
      </div>

      <div class="hist-list">
        <div v-if="loadingHist" class="text-center py-5">
          <div class="spinner-border text-primary"></div>
        </div>
        
        <template v-else-if="currentLogs.length">
          <div v-for="r in currentLogs" :key="r.trxId" class="feed-item">
            <div class="feed-time">
              <div class="day">{{ formatDate(r.tanggal) }}</div>
              <div class="hour">{{ formatTime(r.tanggal) }}</div>
            </div>
            
            <div class="feed-card" :class="`border-${r.tipe.toLowerCase()}`">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <div class="d-flex align-items-center gap-2">
                  <span class="badge-soft" :class="`badge-soft-${r.tipe.toLowerCase()}`">{{ r.tipe }}</span>
                  
                  <button v-if="isAdmin" 
                          class="btn btn-sm btn-icon-edit" 
                          title="Edit Transaksi Ini"
                          @click="bukaEdit(r)">
                    <i class="fas fa-edit"></i>
                  </button>
                </div>
                
                <span class="fw-bold fs-6" :class="`text-${r.tipe.toLowerCase()}`">
                  {{ r.tipe === 'MASUK' ? '+' : r.tipe === 'KELUAR' ? '-' : '' }}{{ fmt(r.qty) }} Kg
                </span>
              </div>
              
              <div class="fw-bold small text-main mb-1">{{ r.keterangan || '-' }}</div>
              
              <div class="d-flex justify-content-between align-items-center mt-2 pt-2 border-top-dashed">
                <span class="small text-muted">
                  <i class="fas fa-warehouse me-1 opacity-50"></i> {{ r.blok || 'Tanpa Lokasi' }}
                </span>
                <span class="sisa-text">Sisa: {{ fmt(r.calculatedBal) }}</span>
              </div>
            </div>
          </div>
        </template>
        
        <div v-else class="text-center py-5 text-muted small">
          Belum ada transaksi di bulan ini.
        </div>
      </div>
    </div>
  </div>
</template>

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
const currentLogs = computed(() => (allLogs.value[activeMonth.value] || []).slice().reverse())

const totalMasukBulanIni = computed(() => {
  return currentLogs.value
    .filter(r => r.tipe === 'MASUK')
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
    const grouped = {}
    
    Object.values(data).sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal)).forEach(r => {
      const finalBal = r.stokAkhir !== undefined ? parseFloat(r.stokAkhir) : 0
      const key = (r.tanggal || '').slice(0, 7)
      if (!grouped[key]) grouped[key] = []
      grouped[key].push({ ...r, calculatedBal: finalBal })
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

<style scoped>
/* WRAPPER & OVERLAY */
.hist-wrapper { position: fixed; inset: 0; z-index: 1060; display: flex; justify-content: flex-end; }
.hist-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(2px); }

/* DRAWER PANEL NORMAL */
.hist-drawer {
  width: 100%; max-width: 400px; height: 100vh;
  background: var(--bg-card); z-index: 2; display: flex; flex-direction: column;
  box-shadow: -10px 0 30px rgba(0,0,0,0.2); border-left: 1px solid var(--border-color);
  animation: slideIn 0.3s ease-out;
}
@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }

/* HEADER & CHIPS */
.drawer-header { padding: 24px 20px; border-bottom: 1px solid var(--border-color); }
.stok-tag { font-size: 0.7rem; font-weight: 800; background: rgba(16, 185, 129, 0.1); color: #10b981; padding: 2px 8px; border-radius: 6px; }
.chips-container { padding: 12px 15px; background: var(--bg-main); }
.chips-scroll { display: flex; gap: 8px; overflow-x: auto; }
.hist-chip { padding: 6px 14px; border-radius: 10px; font-size: 0.75rem; font-weight: 700; cursor: pointer; background: var(--bg-card); color: var(--text-muted); border: 1px solid var(--border-color); }
.hist-chip.active { background: #4f46e5; color: white; border-color: #4f46e5; }

/* SUMMARY BOX (KOTAK TOTAL IN & OUT) */
.summary-box {
  background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 12px; padding: 10px 0;
}
.border-light { border-color: var(--border-color) !important; }

/* FEED LIST */
.hist-list { flex: 1; overflow-y: auto; padding: 20px 15px; }
.feed-item { display: flex; gap: 15px; margin-bottom: 20px; }
.feed-time { text-align: right; min-width: 50px; padding-top: 4px; color: var(--text-muted); }
.day { font-size: 0.75rem; font-weight: 800; color: var(--text-main); }
.hour { font-size: 0.65rem; }
.feed-card { flex: 1; background: var(--bg-main); border-radius: 12px; padding: 12px 15px; border-left: 5px solid; }

/* STATUS COLORS & BADGES */
.border-masuk { border-left-color: #10b981; }
.border-keluar { border-left-color: #ef4444; }
.border-opname { border-left-color: #f59e0b; }
.text-masuk { color: #10b981; }
.text-keluar { color: #ef4444; }
.text-opname { color: #f59e0b; }
.badge-soft { font-size: 0.6rem; font-weight: 800; padding: 3px 8px; border-radius: 5px; text-transform: uppercase; }
.badge-soft-masuk { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.badge-soft-keluar { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
.badge-soft-opname { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
.btn-close-custom { background: var(--bg-main); border: 1px solid var(--border-color); width: 32px; height: 32px; border-radius: 8px; color: var(--text-muted); display: flex; align-items: center; justify-content: center; }

/* TOMBOL EDIT RIWAYAT */
.btn-icon-edit {
  padding: 2px 6px; font-size: 0.65rem; border-radius: 4px;
  background: transparent; color: var(--text-muted); border: 1px solid var(--border-color);
  transition: all 0.2s;
}
.btn-icon-edit:hover {
  background: rgba(14, 165, 233, 0.1); color: #0ea5e9; border-color: rgba(14, 165, 233, 0.3);
}
</style>
