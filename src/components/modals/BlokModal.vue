<template>
  <div class="modal fade show d-block backdrop-blur" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered modal-xl">
      <div class="modal-content modern-modal border-0 shadow-lg">

        <div class="modal-header border-0 pb-3">
          <div class="w-100">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h5 class="modal-title fw-bold d-flex align-items-center gap-2 m-0" style="letter-spacing:-0.5px;">
                <div class="icon-circle bg-primary-subtle text-primary">
                  <i class="fas fa-th-large"></i>
                </div>
                Peta Gudang per Blok
              </h5>
              <div class="d-flex gap-2 align-items-center">
                <button v-if="isAdmin" class="btn btn-sm btn-light-action fw-bold"
                        @click="showKelolaBlok = !showKelolaBlok">
                  <i class="fas fa-cog me-1"></i> Kelola Blok
                </button>
                <button type="button" class="btn-close btn-close-custom" @click="$emit('close')"></button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="showKelolaBlok && isAdmin" class="kelola-area p-3 mb-2 mx-3 rounded shadow-sm">
          <div class="d-flex gap-2 align-items-center flex-wrap">
            <input type="text" class="form-control form-control-sm custom-input text-uppercase fw-bold"
                   style="max-width:200px" v-model="namaBlokBaru"
                   placeholder="Nama Blok Baru..." @keydown.enter="tambahBlok">
            <button class="btn btn-sm btn-success fw-bold shadow-sm" @click="tambahBlok" style="border-radius: 8px;">
              <i class="fas fa-plus me-1"></i> Tambah
            </button>
            <div class="d-flex gap-2 flex-wrap ms-2">
              <span v-for="blok in masterBlok" :key="blok.id"
                    class="badge-soft badge-soft-primary d-flex align-items-center gap-2 px-3 py-2"
                    style="font-size:.8rem">
                {{ blok.nama }}
                <i class="fas fa-times opacity-50 hover-opacity-100" style="cursor:pointer" @click="hapusBlok(blok.id)"></i>
              </span>
            </div>
          </div>
        </div>

        <div class="px-3 pb-3">
          <div class="search-container shadow-sm">
            <div class="search-icon"><i class="fas fa-search"></i></div>
            <input type="text" class="search-input"
                   placeholder="Cari Kode, Nama, Warna..."
                   autocomplete="off" v-model="searchBlok">
            <button v-if="searchBlok" class="clear-btn" @click="searchBlok = ''">
              <i class="fas fa-times-circle"></i>
            </button>
          </div>
        </div>

        <div class="modal-body p-3 pt-0" style="max-height:65vh;overflow-y:auto; overflow-x:hidden;">
          <div class="row g-3">

            <div v-for="blok in blokData" :key="blok.nama" class="col-12 col-md-6 col-lg-4">
              <div class="blok-card shadow-sm"
                   :class="activeBlok === blok.nama ? 'blok-active' : ''"
                   @click="toggleBlok(blok.nama)">
                <div class="blok-header d-flex justify-content-between align-items-center">
                  <div>
                    <h6 class="fw-bold mb-1 d-flex align-items-center gap-2">
                      <i class="fas fa-warehouse opacity-50"></i> {{ blok.nama }}
                    </h6>
                    <div class="fw-bold fs-5">{{ fmt(blok.totalStok) }} <small style="font-size: 60%; opacity: 0.8;">Kg</small></div>
                  </div>
                  <div class="d-flex flex-column align-items-end gap-2">
                    <span class="badge bg-white text-primary shadow-sm fw-bold">{{ blok.items.length }} Item</span>
                    <i class="fas" :class="activeBlok === blok.nama ? 'fa-chevron-up' : 'fa-chevron-down'" style="font-size:.75rem;opacity:.7"></i>
                  </div>
                </div>

                <div v-if="activeBlok === blok.nama" class="blok-items">
                  <div v-for="item in blok.items" :key="item.idUnik"
                       class="blok-item-row" @click.stop>
                    <div class="d-flex justify-content-between align-items-center">
                      <div style="min-width:0;flex:1">
                        <div class="fw-bold text-truncate" style="font-size:.85rem; color:var(--text-main)">
                          {{ item.nama }}<span v-if="item.warna"> - {{ item.warna }}</span>
                        </div>
                        <div class="small fw-medium" style="font-size:.7rem; color:var(--text-muted)">{{ item.kodeErp }}</div>
                      </div>
                      <div class="text-end ms-2">
                        
                        <div v-if="isAdmin && editingItem === item.idUnik + blok.nama"
                             class="d-flex gap-1 align-items-center justify-content-end" @click.stop>
                          <input
                            type="number" step="any"
                            class="form-control form-control-sm text-center fw-bold custom-input"
                            style="width:80px; padding: 4px;"
                            v-model="editStokVal"
                            @keydown.enter="simpanStokBlok(item, blok.nama)"
                            @keydown.escape="editingItem = ''"
                          >
                          <button class="btn btn-xs btn-success" @click.stop="simpanStokBlok(item, blok.nama)"><i class="fas fa-check"></i></button>
                          <button class="btn btn-xs btn-secondary" @click.stop="editingItem = ''"><i class="fas fa-times"></i></button>
                        </div>
                        
                        <div v-else
                             class="fw-bold"
                             :class="item.stokDiBlok < 5 ? 'text-danger' : 'text-success'"
                             style="font-size:.9rem">
                          {{ fmt(item.stokDiBlok) }} Kg
                          <i v-if="isAdmin"
                             class="fas fa-pencil-alt ms-1 text-muted hover-opacity-100"
                             style="font-size:.65rem;cursor:pointer"
                             @click.stop="bukaEditStok(item, blok.nama)"></i>
                        </div>
                        
                        <div v-if="isAdmin" class="d-flex gap-1 mt-2 justify-content-end flex-wrap">
                          <select class="form-select form-select-sm custom-input py-0 px-2"
                                  style="max-width:90px;font-size:.7rem; height: 24px;"
                                  value=""
                                  @change="pindahBlok(item, blok.nama, $event.target.value)"
                                  @click.stop>
                            <option value="">Pindah...</option>
                            <option v-for="b in masterBlok.filter(b => b.nama !== blok.nama)" :key="b.id" :value="b.nama">
                              {{ b.nama }}
                            </option>
                          </select>
                          <button class="btn btn-xs btn-action btn-in" @click.stop="quickTrans('MASUK', item)" title="Masuk">
                            <i class="fas fa-arrow-down"></i>
                          </button>
                          <button class="btn btn-xs btn-action btn-out" @click.stop="quickTrans('KELUAR', item)" title="Keluar">
                            <i class="fas fa-arrow-up"></i>
                          </button>
                          <button class="btn btn-xs btn-action btn-light-action" @click.stop="quickRiwayat(item)" title="Riwayat">
                            <i class="fas fa-history"></i>
                          </button>
                          <button class="btn btn-xs btn-action btn-out border-0" title="Hapus dari blok" @click.stop="hapusDariBlok(item, blok.nama)">
                            <i class="fas fa-trash-alt"></i>
                          </button>
                        </div>

                      </div>
                    </div>
                  </div>

                  <div v-if="isAdmin" class="p-2 border-top bg-light-modern">
                    <div v-if="assigningToBlok === blok.nama" class="p-2 border rounded shadow-sm bg-card" @click.stop>
                      <div class="mb-2" style="position:relative">
                        <input
                          class="form-control form-control-sm custom-input fw-bold"
                          v-model="assignRawKey"
                          placeholder="🔍 Cari Kode / Nama..."
                          autocomplete="off"
                          @input="onInputAssign"
                          @blur="setTimeout(() => assignDrop = false, 150)"
                        >
                        <div v-if="assignDrop && assignSuggestions.length" class="ac-dropdown-new">
                          <div v-for="sug in assignSuggestions" :key="sug.idUnik"
                               class="ac-item-new" @mousedown.prevent="pilihAssignItem(sug)">
                            <div class="d-flex justify-content-between w-100 mb-1">
                              <span class="fw-bold text-primary" style="font-size:.8rem">{{ sug.kodeErp }}</span>
                              <span class="badge bg-light text-dark border">{{ fmt(sug.stok) }} Kg</span>
                            </div>
                            <div class="text-muted text-truncate w-100" style="font-size:.7rem">
                              {{ sug.nama }} <span v-if="sug.warna">- {{ sug.warna }}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div v-if="assignItemPilih" class="mb-2 px-2 py-1 bg-success-subtle text-success rounded small fw-bold text-center">
                        <i class="fas fa-check-circle me-1"></i> Terpilih: {{ assignItemPilih.kodeErp }}
                      </div>

                      <div class="d-flex gap-2">
                        <div class="input-group input-group-sm shadow-sm" style="flex: 1; border-radius: 8px; overflow: hidden;">
                          <input type="number" step="any" placeholder="Jml"
                                 class="form-control text-center fw-bold custom-input border-end-0"
                                 v-model="assignStokVal" @click.stop>
                          <span class="input-group-text custom-addon border-start-0 fw-bold">Kg</span>
                        </div>
                        <button class="btn btn-sm btn-success fw-bold px-3 shadow-sm" style="border-radius:8px;" @click.stop="simpanAssignKeBlok(blok.nama)">
                          <i class="fas fa-save"></i>
                        </button>
                        <button class="btn btn-sm btn-light-action fw-bold px-3 shadow-sm" style="border-radius:8px;" @click.stop="assigningToBlok = ''">
                          <i class="fas fa-times text-danger"></i>
                        </button>
                      </div>
                    </div>

                    <button v-else
                            class="btn btn-sm btn-light-action w-100 fw-bold border-dashed"
                            @click.stop="bukaAssignKeBlok(blok.nama)">
                      <i class="fas fa-plus me-1 text-primary"></i> Tambah Item ke {{ blok.nama }}
                    </button>
                  </div>

                  <div class="blok-total">
                    <span class="fw-bold" style="color:var(--text-muted); font-size: 0.75rem;">TOTAL BLOK</span>
                    <span class="fw-bold text-primary fs-6">{{ fmt(blok.totalStok) }} Kg</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="col-12 col-md-6 col-lg-4" v-if="tanpaLokasi.length">
              <div class="blok-card shadow-sm" style="border-color: #fcd34d !important;"
                   :class="activeBlok === '__TANPALOKASI__' ? 'blok-active-warning' : ''"
                   @click="toggleBlok('__TANPALOKASI__')">
                <div class="blok-header" style="background: linear-gradient(135deg, #d97706, #f59e0b); color: #fff;">
                  <div class="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 class="fw-bold mb-1 d-flex align-items-center gap-2">
                        <i class="fas fa-map-marker-alt opacity-50"></i> Tanpa Lokasi
                      </h6>
                      <div class="fw-bold fs-5">{{ fmt(tanpaLokasi.reduce((s,i) => s + (parseFloat(i.sisaTanpaBlok)||0), 0)) }} <small style="font-size: 60%; opacity: 0.8;">Kg</small></div>
                    </div>
                    <div class="d-flex flex-column align-items-end gap-2">
                      <span class="badge bg-white text-warning shadow-sm fw-bold">{{ tanpaLokasi.length }} Item</span>
                      <i class="fas" :class="activeBlok === '__TANPALOKASI__' ? 'fa-chevron-up' : 'fa-chevron-down'" style="font-size:.75rem;opacity:.7"></i>
                    </div>
                  </div>
                </div>

                <div v-if="activeBlok === '__TANPALOKASI__'" class="blok-items">
                  <div v-for="item in tanpaLokasi" :key="item.idUnik"
                       class="blok-item-row" @click.stop>
                    <div class="d-flex justify-content-between align-items-center">
                      <div style="min-width:0;flex:1">
                        <div class="fw-bold text-truncate" style="font-size:.85rem; color:var(--text-main)">
                          {{ item.nama }}<span v-if="item.warna"> - {{ item.warna }}</span>
                        </div>
                        <div class="small fw-medium" style="font-size:.7rem; color:var(--text-muted)">{{ item.kodeErp }}</div>
                      </div>
                      <div class="text-end ms-2">
                        <div class="fw-bold text-warning" style="font-size:.9rem; filter: brightness(0.85);">
                          {{ fmt(item.sisaTanpaBlok) }} Kg
                        </div>
                        
                        <div v-if="isAdmin" class="mt-2">
                          <div v-if="assigningItem === item.idUnik"
                               class="d-flex gap-1 flex-wrap justify-content-end" @click.stop>
                            <select class="form-select form-select-sm custom-input py-0 px-2"
                                    style="max-width:90px;font-size:.7rem; height:24px"
                                    v-model="assignBlokNama">
                              <option value="">Pilih Blok...</option>
                              <option v-for="b in masterBlok" :key="b.id" :value="b.nama">
                                {{ b.nama }}
                              </option>
                            </select>
                            <input type="number" step="any" placeholder="Kg"
                                   class="form-control form-control-sm text-center custom-input py-0"
                                   style="max-width:60px; height:24px; font-size:0.7rem;"
                                   v-model="assignStokTanpaLok">
                            <button class="btn btn-xs btn-success" @click.stop="simpanAssignTanpaLok(item)"><i class="fas fa-check"></i></button>
                            <button class="btn btn-xs btn-secondary" @click.stop="assigningItem = ''"><i class="fas fa-times"></i></button>
                          </div>
                          <div v-else class="d-flex gap-1 justify-content-end">
                            <button class="btn btn-xs btn-action btn-light-action text-primary" @click.stop="bukaAssignTanpaLok(item)">
                              <i class="fas fa-plus"></i> Set
                            </button>
                            <button class="btn btn-xs btn-action btn-light-action" @click.stop="quickRiwayat(item)">
                              <i class="fas fa-history"></i>
                            </button>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                  <div class="blok-total">
                    <span class="fw-bold" style="color:var(--text-muted); font-size: 0.75rem;">TOTAL TANPA LOKASI</span>
                    <span class="fw-bold text-warning fs-6" style="filter: brightness(0.85);">
                      {{ fmt(tanpaLokasi.reduce((s,i) => s + (parseFloat(i.sisaTanpaBlok)||0), 0)) }} Kg
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <div class="modal-footer bg-light-modern py-3 border-top d-flex justify-content-between align-items-center">
          <div class="small fw-bold" style="color:var(--text-muted)">Total Blok: <span class="text-primary">{{ blokData.length }}</span></div>
          <div class="fw-bold" style="color:var(--text-main)">Grand Total: <span class="text-primary fs-5 ms-1">{{ fmt(grandTotal) }}</span> <small style="color:var(--text-muted)">Kg</small></div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ref as dbRef, set, remove } from 'firebase/database'
import { db } from '../../firebase'
import { dbStok, useStok } from '../../composables/useStok'
import { currentRole } from '../../composables/useAuth'
import { useTrans } from '../../composables/useTrans'
import { useHist } from '../../composables/useHist'
import { masterBlok, loadMasterBlok } from '../../composables/useBlok'

const emit = defineEmits(['close'])
const { bukaTransaksi } = useTrans()
const { bukaRiwayat }   = useHist()
const { kirimTransaksi, kirimMutasi } = useStok() 

const isAdmin        = computed(() => currentRole.value === 'admin')
const showKelolaBlok = ref(false)
const namaBlokBaru   = ref('')
const activeBlok     = ref('')
const searchBlok     = ref('')

const editingItem = ref('')
const editStokVal = ref(0)

const assigningToBlok  = ref('')
const assignRawKey     = ref('')
const assignStokVal    = ref('')
const assignSuggestions = ref([])
const assignDrop       = ref(false)
const assignItemPilih  = ref(null)

const assigningItem      = ref('')
const assignBlokNama     = ref('')
const assignStokTanpaLok = ref('')

const fmt = n => Number(n || 0).toLocaleString('id-ID', {
  minimumFractionDigits: 2, maximumFractionDigits: 2
})

const tambahBlok = async () => {
  if (!namaBlokBaru.value.trim()) return
  const nama = namaBlokBaru.value.trim().toUpperCase()
  if (masterBlok.value.find(b => b.nama === nama)) {
    window.Swal.fire('Sudah Ada', `Blok ${nama} sudah terdaftar.`, 'warning')
    return
  }
  await set(dbRef(db, `master_blok/blok_${Date.now()}`), { nama })
  namaBlokBaru.value = ''
}

const hapusBlok = async (id) => {
  const result = await window.Swal.fire({
    title: 'Hapus Blok?', text: 'Item di dalamnya TIDAK akan terhapus, hanya pindah ke Tanpa Lokasi.',
    icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc3545'
  })
  if (!result.isConfirmed) return
  await remove(dbRef(db, `master_blok/${id}`))
}

const blokData = computed(() => {
  return masterBlok.value.map(blok => {
    let items = dbStok.value
      .filter(i => i.bloks && (parseFloat(i.bloks[blok.nama]) || 0) > 0)
      .map(i => ({ ...i, stokDiBlok: parseFloat(i.bloks[blok.nama] || 0) }))

    if (searchBlok.value) {
      const q = searchBlok.value.toLowerCase()
      items = items.filter(i =>
        (i.nama    || '').toLowerCase().includes(q) ||
        (i.kodeErp || '').toLowerCase().includes(q) ||
        (i.warna   || '').toLowerCase().includes(q)
      )
    }
    const totalStok = items.reduce((s, i) => s + i.stokDiBlok, 0)
    return { nama: blok.nama, items, totalStok }
  }).filter(blok => searchBlok.value ? blok.items.length > 0 : true)
})

const tanpaLokasi = computed(() => {
  let items = []
  dbStok.value.forEach(i => {
    const totalStok = parseFloat(i.stok) || 0
    const diBlok = i.bloks ? Object.values(i.bloks).reduce((s, v) => s + parseFloat(v), 0) : 0
    const selisih = totalStok - diBlok
    
    if (selisih > 0.01) {
      items.push({ ...i, sisaTanpaBlok: selisih })
    }
  })

  if (searchBlok.value) {
    const q = searchBlok.value.toLowerCase()
    items = items.filter(i =>
      (i.nama    || '').toLowerCase().includes(q) ||
      (i.kodeErp || '').toLowerCase().includes(q) ||
      (i.warna   || '').toLowerCase().includes(q)
    )
  }
  return items
})

const grandTotal = computed(() =>
  dbStok.value.reduce((s, i) => s + (parseFloat(i.stok) || 0), 0)
)

const bukaEditStok = (item, blokNama) => {
  editingItem.value = item.idUnik + blokNama
  editStokVal.value = item.stokDiBlok
}

const simpanStokBlok = async (item, blokNama) => {
  const stokBaru = parseFloat(editStokVal.value)
  if (isNaN(stokBaru) || stokBaru < 0) return

  try {
    await kirimTransaksi(item.idUnik, 'OPNAME', stokBaru, 'PENYESUAIAN PETA BLOK', blokNama)
    editingItem.value = ''
    window.Swal.fire({ icon: 'success', title: 'Tersimpan!', timer: 800, showConfirmButton: false })
  } catch(e) { window.Swal.fire('Error', e.message, 'error') }
}

const pindahBlok = async (item, blokAsal, blokTujuan) => {
  if (!blokTujuan) return
  try {
    const bloks      = { ...(item.bloks || {}) }
    const stokPindah = parseFloat(bloks[blokAsal] || 0)
    if (stokPindah <= 0) return
    
    await kirimMutasi(item.idUnik, stokPindah, blokAsal, blokTujuan)

    window.Swal.fire({
      icon: 'success', title: `Dipindah ke Blok ${blokTujuan}`,
      timer: 800, showConfirmButton: false
    })
  } catch(e) { window.Swal.fire('Error', e.message, 'error') }
}

const hapusDariBlok = async (item, blokNama) => {
  const result = await window.Swal.fire({
    title: 'Hapus dari Blok?',
    text: `Item akan ditarik dari Blok ${blokNama} dan menjadi Tanpa Lokasi.`,
    icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc3545'
  })
  if (!result.isConfirmed) return
  try {
    const bloks = { ...(item.bloks || {}) }
    const stokHapus = parseFloat(bloks[blokNama] || 0)
    
    await kirimMutasi(item.idUnik, stokHapus, blokNama, 'Tanpa Lokasi')
  } catch(e) { window.Swal.fire('Error', e.message, 'error') }
}

const bukaAssignKeBlok = (blokNama) => {
  assigningToBlok.value = blokNama
  assignRawKey.value    = ''
  assignStokVal.value   = ''
  assignItemPilih.value = null
}

const onInputAssign = () => {
  assignItemPilih.value = null
  if (!assignRawKey.value) { assignSuggestions.value = []; assignDrop.value = false; return }
  const tokens = assignRawKey.value.toUpperCase().trim().split(/\s+/)
  assignSuggestions.value = dbStok.value.filter(i => {
    const h = [i.kodeErp || '', i.nama || '', i.warna || ''].join(' ').toUpperCase()
    return tokens.every(t => h.includes(t))
  }).slice(0, 8)
  assignDrop.value = assignSuggestions.value.length > 0
}

const pilihAssignItem = (item) => {
  assignItemPilih.value = item
  assignRawKey.value    = item.kodeErp
  assignDrop.value      = false
}

const simpanAssignKeBlok = async (blokNama) => {
  if (!assignItemPilih.value) {
    window.Swal.fire('Peringatan', 'Pilih item dulu.', 'warning'); return
  }
  const stokMutasi = parseFloat(assignStokVal.value)
  if (isNaN(stokMutasi) || stokMutasi <= 0) {
    window.Swal.fire('Peringatan', 'Isi jumlah Kg.', 'warning'); return
  }
  
  try {
    const item = assignItemPilih.value
    await kirimMutasi(item.idUnik, stokMutasi, 'Tanpa Lokasi', blokNama)

    assigningToBlok.value = ''
    assignRawKey.value    = ''
    assignStokVal.value   = ''
    assignItemPilih.value = null
    window.Swal.fire({
      icon: 'success', title: `Ditambahkan ke Blok ${blokNama}`,
      timer: 800, showConfirmButton: false
    })
  } catch(e) { window.Swal.fire('Error', e.message, 'error') }
}

const bukaAssignTanpaLok = (item) => {
  assigningItem.value      = item.idUnik
  assignBlokNama.value     = ''
  assignStokTanpaLok.value = item.sisaTanpaBlok 
}

const simpanAssignTanpaLok = async (item) => {
  if (!assignBlokNama.value) {
    window.Swal.fire('Peringatan', 'Pilih blok dulu.', 'warning'); return
  }
  const stokMutasi = parseFloat(assignStokTanpaLok.value)
  if (isNaN(stokMutasi) || stokMutasi <= 0) {
    window.Swal.fire('Peringatan', 'Isi jumlah Kg.', 'warning'); return
  }

  try {
    await kirimMutasi(item.idUnik, stokMutasi, 'Tanpa Lokasi', assignBlokNama.value)

    assigningItem.value      = ''
    assignBlokNama.value     = ''
    assignStokTanpaLok.value = ''
    window.Swal.fire({
      icon: 'success', title: `Masuk ke Blok ${assignBlokNama.value}`,
      timer: 800, showConfirmButton: false
    })
  } catch(e) { window.Swal.fire('Error', e.message, 'error') }
}

const toggleBlok = nama => {
  activeBlok.value = activeBlok.value === nama ? '' : nama
}

watch(searchBlok, val => {
  if (val) {
    const blokAda = blokData.value.find(b => b.items.length > 0)
    if (blokAda) activeBlok.value = blokAda.nama
  } else {
    activeBlok.value = ''
  }
})

const quickTrans = (tipe, item) => {
  emit('close')
  setTimeout(() => bukaTransaksi(tipe, item), 300)
}

const quickRiwayat = (item) => {
  emit('close')
  setTimeout(() => bukaRiwayat(item.idUnik), 300)
}

onMounted(() => loadMasterBlok())
</script>

<style scoped>
.backdrop-blur { background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); }

.modern-modal {
  border-radius: 20px;
  background: var(--bg-main);
  overflow: hidden;
}

.icon-circle {
  width: 40px; height: 40px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center; font-size: 1.2rem;
}

.bg-primary-subtle { background: rgba(79, 70, 229, 0.1); }
.text-primary { color: #4f46e5 !important; }

.btn-close-custom {
  background: transparent url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%2364748b'%3e%3cpath d='M.293.293a1 1 0 0 1 1.414 0L8 6.586 14.293.293a1 1 0 1 1 1.414 1.414L9.414 8l6.293 6.293a1 1 0 0 1-1.414 1.414L8 9.414l-6.293 6.293a1 1 0 0 1-1.414-1.414L6.586 8 .293 1.707a1 1 0 0 1 0-1.414z'/%3e%3c/svg%3e") center/1em auto no-repeat;
  border: none; width: 32px; height: 32px; opacity: 0.5; transition: opacity 0.2s; cursor:pointer;
}
.btn-close-custom:hover { opacity: 1; }

.kelola-area {
  background: var(--bg-card); border: 1px solid var(--border-color);
}
.badge-soft {
  font-size: 0.75rem; padding: 4px 10px; border-radius: 8px; font-weight: 700;
}
.badge-soft-primary { background: rgba(79, 70, 229, 0.1); color: #4f46e5; }
.hover-opacity-100:hover { opacity: 1 !important; color: #ef4444; }

/* SEARCH BAR */
.search-container {
  display: flex; align-items: center; background: var(--bg-card);
  border-radius: 12px; padding: 8px 16px; border: 1px solid var(--border-color); transition: all 0.3s ease;
}
.search-container:focus-within { border-color: #818cf8; box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1); }
.search-icon { color: var(--text-muted); margin-right: 12px; }
.search-input { flex: 1; border: none; background: transparent; color: var(--text-main); font-weight: 500; outline: none; }
.search-input::placeholder { color: var(--text-muted); opacity: 0.6; }
.clear-btn { background: transparent; border: none; color: var(--text-muted); cursor: pointer; }
.clear-btn:hover { color: #ef4444; }

/* FIX KARTU BLOK: Hapus overflow:hidden agar dropdown tidak terpotong */
.blok-card {
  border: 1px solid var(--border-color); border-radius: 16px;
  cursor: pointer; transition: all .2s; background: var(--bg-card);
}
.blok-card:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
.blok-active { border: 2px solid #4f46e5 !important; }
.blok-active-warning { border: 2px solid #f59e0b !important; }

/* FIX BLOK HEADER: Tambah border radius atas pengganti overflow hidden */
.blok-header {
  background: linear-gradient(135deg, #4f46e5, #3b82f6); color: #fff; padding: 16px;
  border-top-left-radius: 15px; border-top-right-radius: 15px;
}
.blok-items { padding: 0; border-top: 1px solid var(--border-color); }
.blok-item-row {
  padding: 12px 16px; border-bottom: 1px solid var(--border-color); transition: background .15s;
}
.blok-item-row:hover { background: rgba(0,0,0,0.02); }

.bg-light-modern { background: var(--bg-main); }
.bg-card { background: var(--bg-card); }

/* CUSTOM INPUTS */
.custom-input {
  background: var(--bg-card); color: var(--text-main); border: 1px solid var(--border-color); border-radius: 8px;
}
.custom-input:focus { border-color: #818cf8; box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1); outline: none; }
.custom-addon { background: var(--bg-main); color: var(--text-muted); border: 1px solid var(--border-color); }

.blok-total {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 16px; background: var(--bg-main); border-top: 1px dashed var(--border-color);
}

.btn-action {
  width: 28px; height: 28px; border-radius: 6px; padding:0; display:flex; align-items:center; justify-content:center;
  font-size: 0.75rem; border: 1px solid transparent; transition: all 0.2s;
}
.btn-in { background: rgba(16, 185, 129, 0.1); color: #10b981; border-color: rgba(16, 185, 129, 0.2); }
.btn-in:hover { background: #10b981; color: #fff; }
.btn-out { background: rgba(239, 68, 68, 0.1); color: #ef4444; border-color: rgba(239, 68, 68, 0.2); }
.btn-out:hover { background: #ef4444; color: #fff; }
.btn-light-action { background: var(--bg-main); color: var(--text-muted); border-color: var(--border-color); }
.btn-light-action:hover { background: var(--border-color); color: var(--text-main); }

.border-dashed { border-style: dashed !important; opacity: 0.8; }
.border-dashed:hover { opacity: 1; }

/* FIX DROPDOWN PENCARIAN */
.ac-dropdown-new {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0;
  background: var(--bg-card); border: 1px solid var(--border-color);
  border-radius: 8px; z-index: 9999; max-height: 200px; overflow-y: auto;
  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.2);
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}
.ac-dropdown-new::-webkit-scrollbar { width: 6px; }
.ac-dropdown-new::-webkit-scrollbar-track { background: transparent; }
.ac-dropdown-new::-webkit-scrollbar-thumb { background: rgba(100, 116, 139, 0.4); border-radius: 10px; }
.ac-dropdown-new::-webkit-scrollbar-thumb:hover { background: rgba(100, 116, 139, 0.7); }

.ac-item-new {
  padding: 8px 12px; cursor: pointer; border-bottom: 1px solid var(--border-color);
}
.ac-item-new:last-child { border-bottom: none; }
.ac-item-new:hover { background-color: var(--bg-main); }
.bg-success-subtle { background: rgba(16, 185, 129, 0.1); }
.text-success { color: #10b981 !important; }
</style>
