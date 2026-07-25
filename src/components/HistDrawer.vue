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

      <!-- 🔥 AKSI HAPUS MUNCUL JIKA ADA YANG DICENTANG 🔥 -->
      <div v-if="isAdmin && checkedIds.length > 0" class="px-3 pt-3">
        <button class="btn btn-danger fw-bold w-100 shadow-sm" @click="hapusRiwayatMassal" :disabled="isDeleting">
          <i v-if="isDeleting" class="fas fa-circle-notch fa-spin me-2"></i>
          <i v-else class="fas fa-trash-alt me-2"></i>
          Hapus {{ checkedIds.length }} Transaksi
        </button>
        <div class="text-center mt-2 small text-danger fw-bold">
          <i class="fas fa-exclamation-triangle"></i> Peringatan: Stok akhir akan dikalkulasi ulang!
        </div>
      </div>

      <!-- SUMMARY BOX -->
      <div v-else-if="currentLogs.length" class="px-3 pt-3">
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
            
            <div class="feed-card" :class="['border-' + r.tipe.toLowerCase(), checkedIds.includes(r.trxId) ? 'card-selected' : '']">
              
              <!-- 🔥 BAGIAN ATAS: Checkbox, Badge, Edit, dan QTY UTAMA 🔥 -->
              <div class="d-flex justify-content-between align-items-start mb-1 gap-2">
                <div class="d-flex align-items-center gap-2 flex-wrap">
                  <!-- CHECKBOX -->
                  <input v-if="isAdmin" type="checkbox" class="form-check-input hist-checkbox m-0 shadow-sm" 
                         :value="r.trxId" v-model="checkedIds">
                         
                  <span class="badge-soft" :class="`badge-soft-${r.tipe.toLowerCase()}`">{{ r.tipe }}</span>
                  
                  <button v-if="isAdmin && checkedIds.length === 0" 
                          class="btn btn-sm btn-icon-edit" 
                          title="Edit Transaksi Ini"
                          @click="bukaEdit(r)">
                    <i class="fas fa-edit"></i>
                  </button>
                </div>
                
                <!-- QTY UTAMA (Terkunci satu baris dengan white-space: nowrap) -->
                <span class="fw-bold fs-6 text-end" :class="`text-${r.tipe.toLowerCase()}`" style="white-space: nowrap;">
                  {{ r.tipe === 'MASUK' ? '+' : r.tipe === 'KELUAR' ? '-' : '' }}{{ fmt(r.qty) }} Kg
                </span>
              </div>
              
              <!-- 🔥 BAGIAN TENGAH: Keterangan & Badge Selisih 🔥 -->
              <div class="fw-bold small text-main mb-1">{{ r.keterangan || '-' }}</div>
              
              <!-- INFO SELISIH KHUSUS CEK RANDOM -->
              <div v-if="r.tipe === 'CEK_RANDOM'" class="mb-2 mt-1 d-flex align-items-center gap-1">
                <span class="small text-muted fw-bold" style="font-size: 0.7rem;">Sisa Cek thd Sistem:</span>
                <span class="badge-soft shadow-sm" 
                      :class="(r.qty - r.calculatedBal) > 0 ? 'badge-soft-masuk' : ((r.qty - r.calculatedBal) < 0 ? 'badge-soft-keluar' : 'badge-soft-secondary')"
                      style="font-size: 0.65rem; padding: 2px 6px;">
                  {{ (r.qty - r.calculatedBal) > 0 ? '+' : '' }}{{ fmt(r.qty - r.calculatedBal) }} Kg
                </span>
              </div>
              
              <div class="d-flex justify-content-between align-items-center mt-2 pt-2 border-top-dashed">
                <span class="small text-muted">
                  <i class="fas fa-warehouse me-1 opacity-50"></i> {{ r.blok || 'Tanpa Lokasi' }}
                </span>
                <span class="sisa-text">Sisa Akhir: {{ fmt(r.calculatedBal) }}</span>
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
import { ref as dbRef, onValue, get, update } from 'firebase/database'
import { db } from '../firebase'
import { dbStok } from '../composables/useStok' 
import { activeHistId } from '../composables/useHist'
import { currentRole } from '../composables/useAuth'
import { activeEditTrans } from '../composables/useEditTrans'

const emit = defineEmits(['close'])

const fmt = (n) => Number(n || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const BULAN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
const allLogs = ref({})
const activeMonth = ref('')
const loadingHist = ref(false)
const isDeleting = ref(false)
const checkedIds = ref([]) 
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
  checkedIds.value = [] // Kosongkan centangan saat ganti item
  
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
    if (!activeMonth.value) {
      activeMonth.value = Object.keys(grouped).sort((a,b) => b.localeCompare(a))[0] || ''
    }
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

// MESIN HAPUS & HITUNG ULANG OTOMATIS
const hapusRiwayatMassal = async () => {
  if (!checkedIds.value.length) return
  
  const konfirmasi = await window.Swal.fire({
    title: `Hapus ${checkedIds.value.length} Transaksi?`,
    text: 'Stok utama & stok per-blok akan dikalkulasi ulang secara otomatis.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Ya, Hapus!'
  })
  if (!konfirmasi.isConfirmed) return

  isDeleting.value = true
  const itemId = activeItem.value.idUnik

  try {
    const delUpdates = {}
    
    checkedIds.value.forEach(tId => {
      delUpdates[`riwayat_transaksi/${itemId}/${tId}`] = null
    })
    await update(dbRef(db), delUpdates)
    
    const [snapM, snapH] = await Promise.all([
      get(dbRef(db, `stok_benang/${itemId}`)), 
      get(dbRef(db, `riwayat_transaksi/${itemId}`))
    ])
    
    const itemMaster = snapM.val() || {}
    const histories = snapH.val() || {}
    const auditUp = {}
    
    let run = Number(itemMaster.stokAwal) || 0
    const bloksAudit = {}
    
    const sisaHistori = Object.values(histories).sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal))
    
    sisaHistori.forEach(l => {
      const q = Number(l.qty)
      if (l.tipe === 'MASUK') { 
        run += q; 
        if (l.blok) bloksAudit[l.blok] = (parseFloat(bloksAudit[l.blok]) || 0) + q 
      } else if (l.tipe === 'KELUAR') { 
        run -= q; 
        if (l.blok) bloksAudit[l.blok] = (parseFloat(bloksAudit[l.blok]) || 0) - q 
      } else if (l.tipe === 'OPNAME') { 
        if (l.blok) { 
          run += (q - (parseFloat(bloksAudit[l.blok])||0)); 
          bloksAudit[l.blok] = q 
        } else {
          run = q 
        }
      }
      auditUp[`riwayat_transaksi/${itemId}/${l.trxId}/stokAkhir`] = parseFloat(run.toFixed(2))
    })
    
    Object.keys(bloksAudit).forEach(k => {
      if (Math.abs(bloksAudit[k]) < 0.01) delete bloksAudit[k]
    })
    
    auditUp[`stok_benang/${itemId}/stok`] = parseFloat(run.toFixed(2))
    auditUp[`stok_benang/${itemId}/bloks`] = Object.keys(bloksAudit).length ? bloksAudit : null
    
    await update(dbRef(db), auditUp)
    
    checkedIds.value = [] 
    window.Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Riwayat dihapus & stok disesuaikan', timer: 2000, showConfirmButton: false })
  } catch (error) {
    window.Swal.fire('Error', error.message, 'error')
  } finally {
    isDeleting.value = false
  }
}

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
.chips-container { padding: 12px 15px; background: var(--bg-main); border-bottom: 1px solid var(--border-color); }
.chips-scroll { display: flex; gap: 8px; overflow-x: auto; }
.hist-chip { padding: 6px 14px; border-radius: 10px; font-size: 0.75rem; font-weight: 700; cursor: pointer; background: var(--bg-card); color: var(--text-muted); border: 1px solid var(--border-color); white-space: nowrap; }
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
.feed-card { flex: 1; background: var(--bg-main); border-radius: 12px; padding: 12px 15px; border-left: 5px solid; transition: all 0.2s; }
.card-selected { background: rgba(239, 68, 68, 0.05); border-color: #ef4444; }

/* STYLE CHECKBOX */
.hist-checkbox { width: 1.1rem; height: 1.1rem; cursor: pointer; border: 2px solid var(--border-color); }
.hist-checkbox:checked { background-color: #ef4444; border-color: #ef4444; }

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

/* 🔥 TAMBAHAN UNTUK CEK RANDOM (Warna Ungu) 🔥 */
.border-cek_random { border-left-color: #8b5cf6 !important; }
.text-cek_random { color: #8b5cf6 !important; }
.badge-soft-cek_random { background: rgba(139, 92, 246, 0.1) !important; color: #8b5cf6 !important; }

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
.border-top-dashed { border-top: 1px dashed var(--border-color); }
.sisa-text { font-size: 0.75rem; font-weight: 700; color: var(--text-main); }
</style>
