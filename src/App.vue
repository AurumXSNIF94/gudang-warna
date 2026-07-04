<template>
  <div>
    <div v-if="isOffline" class="offline-badge shadow-sm">
      <i class="fas fa-wifi-slash me-2"></i>
      KONEKSI TERPUTUS - Data akan disinkronkan otomatis saat sinyal kembali.
    </div>

    <LoginView v-if="!authReady || !currentUser" />

    <div v-else-if="loading" class="loading-overlay">
      <div class="spinner-border text-primary mb-3" style="width: 3rem; height: 3rem;"></div>
      <h5 class="fw-bold text-primary" style="letter-spacing: -0.5px;">Sinkronisasi Data...</h5>
      <p class="text-muted small">Menghubungkan ke Gudang Warna</p>
    </div>

    <template v-else>
      <NavBar />
      <div class="container pb-5">
        
        <div v-if="currentRole === 'admin'" class="d-flex gap-2 my-3 flex-wrap">
          <button class="btn fw-bold shadow-sm flex-grow-1" 
                  style="background-color: #d97706; color: white; border: none;" 
                  @click="showSelisihModal = true">
            <i class="fas fa-balance-scale me-2"></i> AUDIT SELISIH FISIK
          </button>
          
          <button class="btn btn-danger fw-bold shadow-sm flex-grow-1" @click="sapuBersihDatabase">
            <i class="fas fa-broom me-2"></i> BERSIHKAN BLOK SILUMAN
          </button>
        </div>

        <StickySearch />
        <div class="row g-4 mt-2">
          <CardItem
            v-for="item in visibleItems"
            :key="item.idUnik"
            :item="item"
            :velocity="itemVelocity[item.idUnik]"
            :role="currentRole"
            @transaksi="onTransaksi"
            @riwayat="onRiwayat"
          />
        </div>
        
        <div v-if="!filteredItems.length" class="empty-state">
          <div class="empty-icon"><i class="fas fa-box-open"></i></div>
          <h4 class="fw-bold mt-3">Data Tidak Ditemukan</h4>
          <p class="text-muted">Coba gunakan kata kunci atau filter yang berbeda.</p>
        </div>
      </div>

      <TransModal v-if="showTransModal" @close="activeTrans = null" />
      <HistDrawer v-show="showHistDrawer" ref="histDrawerRef" @close="activeHistId = ''" />
      <DailyModal v-if="showDailyModal" ref="dailyModalRef" @close="showDailyModal = false" />
      <SuratJalanModal v-if="showSuratJalanModal" @close="showSuratJalanModal = false" />
      <SelisihModal v-if="showSelisihModal" @close="showSelisihModal = false" />
      <MutasiModal v-if="showMutasiModal" @close="showMutasiModal = false" />
      <BulananModal v-if="showBulananModal" @close="showBulananModal = false" />
      <AddModal v-if="showAddModal" @close="showAddModal = false" />
      <BatchModal v-if="showBatchModal" @close="showBatchModal = false" />
      <BlokModal v-if="showBlokModal" @close="showBlokModal = false" />
      
      <EditTransModal
        v-if="activeEditTrans"
        @close="activeEditTrans = null"
        @saved="onEditSaved"
      />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuth, currentRole } from './composables/useAuth'
import { useStok, itemVelocity, loading } from './composables/useStok'
import { filteredItems } from './composables/useFilter'
import { useTrans, activeTrans } from './composables/useTrans'
import { useHist, activeHistId } from './composables/useHist'
import { loadMasterBlok } from './composables/useBlok'

import LoginView from './components/LoginView.vue'
import NavBar from './components/NavBar.vue'
import StickySearch from './components/StickySearch.vue'
import CardItem from './components/CardItem.vue'
import TransModal from './components/modals/TransModal.vue'
import HistDrawer from './components/HistDrawer.vue'
import DailyModal from './components/modals/DailyModal.vue'
import MutasiModal from './components/modals/MutasiModal.vue'
import BulananModal from './components/modals/BulananModal.vue'
import AddModal from './components/modals/AddModal.vue'
import BatchModal from './components/modals/BatchModal.vue'
import EditTransModal from './components/modals/EditTransModal.vue'
import SelisihModal from './components/modals/SelisihModal.vue'
import SuratJalanModal from './components/modals/SuratJalanModal.vue'
import BlokModal from './components/modals/BlokModal.vue'

import { showDailyModal } from './composables/useDaily'
import { showMutasiModal } from './composables/useMutasi'
import { showBulananModal } from './composables/useBulanan'
import { showAddModal } from './composables/useAdd'
import { showBatchModal } from './composables/useBatch'
import { activeEditTrans } from './composables/useEditTrans'
import { showSelisihModal } from './composables/useSelisih'
import { showSuratJalanModal } from './composables/useSuratJalan'
import { showBlokModal } from './composables/useBlok'

const { initAuth } = useAuth()

const { refreshData, sapuBersihDatabase } = useStok()
const { bukaRiwayat } = useHist()
const { bukaTransaksi } = useTrans()

const currentUser  = ref(null)
const authReady    = ref(false)
const isOffline    = ref(false)
const itemsToShow  = ref(30)
const histDrawerRef = ref(null)
const dailyModalRef = ref(null)

const visibleItems   = computed(() => filteredItems.value.slice(0, itemsToShow.value))
const showTransModal = computed(() => !!activeTrans.value)
const showHistDrawer = computed(() => !!activeHistId.value)

initAuth(user => {
  currentUser.value = user
  authReady.value   = true
  if (user) {
    refreshData()
    loadMasterBlok()
  }
})

const onTransaksi = (tipe, item) => bukaTransaksi(tipe, item)
const onRiwayat   = (id) => bukaRiwayat(id)

const onEditSaved = () => {
  histDrawerRef.value?.reloadHist()
  dailyModalRef.value?.loadData()
}

const handleOffline = () => { isOffline.value = true }
const handleOnline  = () => { isOffline.value = false }

onMounted(() => {
  window.addEventListener('offline', handleOffline)
  window.addEventListener('online',  handleOnline)
  window.addEventListener('scroll', () => {
    if (window.scrollY + window.innerHeight > document.body.scrollHeight - 250) {
      if (itemsToShow.value < filteredItems.value.length) itemsToShow.value += 20
    }
  })
})

onUnmounted(() => {
  window.removeEventListener('offline', handleOffline)
  window.removeEventListener('online',  handleOnline)
})
</script>

<style>
/* VARIABEL WARNA (LIGHT MODE & BOOTSTRAP LIGHT) */
:root, [data-bs-theme="light"] {
  --bg-main: #F8FAFC;
  --bg-card: #ffffff;
  --text-main: #0f172a;
  --text-muted: #64748b;
  --border-color: #e2e8f0;
  
  --nav-bg: rgba(255, 255, 255, 0.9);
  --nav-border: rgba(255, 255, 255, 0.5);
  --glass-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
}

/* VARIABEL WARNA (DARK MODE & BOOTSTRAP DARK) */
[data-bs-theme="dark"] {
  --bg-main: #0f172a;        
  --bg-card: #1e293b;        
  --text-main: #f8fafc;      
  --text-muted: #94a3b8;    
  --border-color: #334155;  
  
  --nav-bg: rgba(30, 41, 59, 0.9);
  --nav-border: rgba(51, 65, 85, 0.5);
  --glass-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);
}

body { 
  background-color: var(--bg-main) !important; 
  color: var(--text-main) !important;
  font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; 
  transition: background-color 0.3s ease, color 0.3s ease;
  min-height: 100vh;
}

.offline-badge {
  position: fixed; top: 0; left: 0; width: 100%;
  background: #ef4444; color: #fff; text-align: center;
  padding: 8px; font-size: 0.8rem; font-weight: 700;
  z-index: 11000; letter-spacing: 0.5px;
}

.loading-overlay {
  position: fixed; inset: 0; 
  background: var(--bg-main); 
  z-index: 9999; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  transition: background-color 0.3s ease;
}

.empty-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 60px 20px; text-align: center; color: var(--text-main);
}
.empty-icon {
  font-size: 4rem; color: var(--text-muted); margin-bottom: 20px;
}
</style>
