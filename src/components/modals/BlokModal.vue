<template>
  <div class="modal fade show d-block backdrop-blur" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered modal-xl">
      <div class="modal-content modern-modal border-0 shadow-lg">

        <!-- HEADER & SEARCH -->
        <div class="modal-header border-0 pb-3">
          <h5 class="modal-title fw-bold"><i class="fas fa-th-large me-2"></i> Peta Gudang per Blok</h5>
          <button type="button" class="btn-close" @click="$emit('close')"></button>
        </div>

        <div class="px-3 pb-3">
          <input type="text" class="form-control custom-input" placeholder="Cari Kode, Nama, Warna..." v-model="searchBlok">
        </div>

        <!-- BODY -->
        <div class="modal-body p-3 pt-0" style="max-height:65vh;overflow-y:auto;">
          <div class="row g-3">
            <div v-for="blok in blokData" :key="blok.nama" class="col-12 col-md-6 col-lg-4">
              <div class="blok-card" :class="activeBlok === blok.nama ? 'blok-active' : ''" @click="toggleBlok(blok.nama)">
                <div class="blok-header d-flex justify-content-between align-items-center">
                  <div>
                    <h6 class="fw-bold mb-1">{{ blok.nama }}</h6>
                    <div class="fw-bold">{{ fmt(blok.totalStok) }} Kg</div>
                  </div>
                  <span class="badge bg-white text-primary">{{ blok.items.length }} Item</span>
                </div>

                <div v-if="activeBlok === blok.nama" class="blok-items">
                  <!-- ITEM LIST -->
                  <div v-for="item in blok.items" :key="item.idUnik" class="blok-item-row">
                    <div class="d-flex justify-content-between align-items-center">
                      <div>
                        <div class="fw-bold" style="font-size:.85rem">{{ item.nama }}</div>
                        <div class="small text-indigo" style="font-size:.75rem">{{ item.warna || '-' }}</div>
                        <div class="small font-monospace" style="font-size:.7rem; color:var(--text-muted)">{{ item.kodeErp }}</div>
                      </div>
                      <div class="text-end">
                        <div v-if="editingItem === item.idUnik + blok.nama" class="d-flex gap-1">
                          <input type="number" class="form-control form-control-sm" style="width:70px" v-model="editStokVal" @keydown.enter="simpanStokBlok(item, blok.nama)">
                          <button class="btn btn-xs btn-success" @click="simpanStokBlok(item, blok.nama)"><i class="fas fa-check"></i></button>
                        </div>
                        <div v-else class="fw-bold text-success">
                          {{ fmt(item.stokDiBlok) }} Kg <i class="fas fa-pencil-alt ms-1 text-muted" style="cursor:pointer" @click="bukaEditStok(item, blok.nama)"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- TOMBOL TAMBAH ITEM KE BLOK -->
                  <div class="p-2 border-top">
                    <button v-if="assigningToBlok !== blok.nama" class="btn btn-sm btn-light-action w-100" @click.stop="bukaAssignKeBlok(blok.nama)">
                      <i class="fas fa-plus text-primary"></i> Tambah Item
                    </button>
                    <!-- FORM TAMBAH -->
                    <div v-else class="p-2 border rounded bg-light">
                      <input class="form-control form-control-sm mb-1" placeholder="Cari Barang..." v-model="assignRawKey" @input="onInputAssign">
                      <div v-if="assignDrop" class="ac-dropdown">
                        <div v-for="sug in assignSuggestions" :key="sug.idUnik" class="ac-item" @mousedown="pilihAssignItem(sug)">
                          {{ sug.nama }} - {{ sug.kodeErp }}
                        </div>
                      </div>
                      <input type="number" class="form-control form-control-sm mb-1" placeholder="Kg" v-model="assignStokVal">
                      <div class="d-flex gap-1">
                        <button class="btn btn-sm btn-success flex-grow-1" @click="simpanAssignKeBlok(blok.nama)">Simpan</button>
                        <button class="btn btn-sm btn-secondary" @click="assigningToBlok = ''">Batal</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { dbStok, useStok } from '../../composables/useStok'
import { masterBlok } from '../../composables/useBlok'
import { currentRole } from '../../composables/useAuth'

const { kirimTransaksi, kirimMutasi } = useStok()
const isAdmin = computed(() => currentRole.value === 'admin')
const activeBlok = ref('')
const searchBlok = ref('')
const editingItem = ref('')
const editStokVal = ref(0)

// Variabel Tambah Item
const assigningToBlok = ref('')
const assignRawKey = ref('')
const assignStokVal = ref('')
const assignSuggestions = ref([])
const assignDrop = ref(false)
const assignItemPilih = ref(null)

const fmt = n => Number(n || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const blokData = computed(() => {
  return masterBlok.value.map(blok => {
    let items = dbStok.value
      .filter(i => i.bloks && (parseFloat(i.bloks[blok.nama]) || 0) !== 0)
      .map(i => ({ ...i, stokDiBlok: parseFloat(i.bloks[blok.nama] || 0) }))
    
    if (searchBlok.value) {
      const q = searchBlok.value.toLowerCase()
      items = items.filter(i => (i.nama||'').toLowerCase().includes(q) || (i.kodeErp||'').toLowerCase().includes(q) || (i.warna||'').toLowerCase().includes(q))
    }
    return { nama: blok.nama, items, totalStok: items.reduce((s, i) => s + i.stokDiBlok, 0) }
  })
})

const toggleBlok = nama => { activeBlok.value = activeBlok.value === nama ? '' : nama }

const bukaAssignKeBlok = (blokNama) => { assigningToBlok.value = blokNama }

const onInputAssign = () => {
  if (!assignRawKey.value) { assignDrop.value = false; return }
  assignSuggestions.value = dbStok.value.filter(i => (i.nama + i.kodeErp).toLowerCase().includes(assignRawKey.value.toLowerCase())).slice(0, 5)
  assignDrop.value = true
}

const pilihAssignItem = (item) => {
  assignItemPilih.value = item
  assignRawKey.value = item.nama
  assignDrop.value = false
}

const simpanAssignKeBlok = async (blokNama) => {
  if (!assignItemPilih.value) return
  await kirimMutasi(assignItemPilih.value.idUnik, parseFloat(assignStokVal.value), 'Tanpa Lokasi', blokNama)
  assigningToBlok.value = ''
}

const bukaEditStok = (item, blokNama) => { editingItem.value = item.idUnik + blokNama; editStokVal.value = item.stokDiBlok }
const simpanStokBlok = async (item, blokNama) => {
  await kirimTransaksi(item.idUnik, 'OPNAME', editStokVal.value, 'Update Manual', blokNama)
  editingItem.value = ''
}
</script>

<style scoped>
.ac-dropdown { position: absolute; background: white; border: 1px solid #ccc; z-index: 1000; width: 90%; }
.ac-item { padding: 5px; cursor: pointer; }
.ac-item:hover { background: #eee; }
.text-indigo { color: #6366f1; }
/* (Sertakan semua CSS asli dari file lu sebelumnya di bawah sini) */
.backdrop-blur { background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); }
.modern-modal { border-radius: 20px; background: var(--bg-main); overflow: hidden; }
.icon-circle { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.blok-card { border: 1px solid var(--border-color); border-radius: 16px; cursor: pointer; background: var(--bg-card); transition: .2s; }
.blok-header { background: linear-gradient(135deg, #4f46e5, #3b82f6); color: #fff; padding: 16px; border-radius: 15px 15px 0 0; }
.blok-item-row { padding: 10px 16px; border-bottom: 1px solid var(--border-color); }
.btn-action { width: 26px; height: 26px; padding: 0; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; }
.btn-in { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.btn-out { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
.badge-soft { font-size: 0.75rem; padding: 4px 10px; border-radius: 8px; font-weight: 700; }
.badge-soft-primary { background: rgba(79, 70, 229, 0.1); color: #4f46e5; }
.search-container { display: flex; align-items: center; background: var(--bg-card); border-radius: 12px; padding: 8px 16px; border: 1px solid var(--border-color); }
.search-input { flex: 1; border: none; background: transparent; outline: none; }
</style>
