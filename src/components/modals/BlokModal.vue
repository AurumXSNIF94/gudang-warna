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
                <button v-if="isAdmin" class="btn btn-sm btn-light-action fw-bold" @click="showKelolaBlok = !showKelolaBlok">
                  <i class="fas fa-cog me-1"></i> Kelola Blok
                </button>
                <button type="button" class="btn-close btn-close-custom" @click="$emit('close')"></button>
              </div>
            </div>
          </div>
        </div>

        <!-- AREA KELOLA BLOK -->
        <div v-if="showKelolaBlok && isAdmin" class="kelola-area p-3 mb-2 mx-3 rounded shadow-sm">
          <div class="d-flex gap-2 align-items-center flex-wrap">
            <input type="text" class="form-control form-control-sm custom-input text-uppercase fw-bold" style="max-width:200px" v-model="namaBlokBaru" placeholder="Nama Blok Baru..." @keydown.enter="tambahBlok">
            <button class="btn btn-sm btn-success fw-bold shadow-sm" @click="tambahBlok" style="border-radius: 8px;">
              <i class="fas fa-plus me-1"></i> Tambah
            </button>
            <div class="d-flex gap-2 flex-wrap ms-2">
              <span v-for="blok in masterBlok" :key="blok.id" class="badge-soft badge-soft-primary d-flex align-items-center gap-2 px-3 py-2" style="font-size:.8rem">
                {{ blok.nama }} <i class="fas fa-times opacity-50 hover-opacity-100" style="cursor:pointer" @click="hapusBlok(blok.id)"></i>
              </span>
            </div>
          </div>
        </div>

        <!-- SEARCH -->
        <div class="px-3 pb-3">
          <div class="search-container shadow-sm">
            <div class="search-icon"><i class="fas fa-search"></i></div>
            <input type="text" class="search-input" placeholder="Cari Kode, Nama, Warna..." v-model="searchBlok">
          </div>
        </div>

        <!-- BODY -->
        <div class="modal-body p-3 pt-0" style="max-height:65vh;overflow-y:auto;">
          <div class="row g-3">
            <div v-for="blok in blokData" :key="blok.nama" class="col-12 col-md-6 col-lg-4">
              <div class="blok-card shadow-sm" :class="activeBlok === blok.nama ? 'blok-active' : ''" @click="toggleBlok(blok.nama)">
                <div class="blok-header d-flex justify-content-between align-items-center">
                  <div>
                    <h6 class="fw-bold mb-1 d-flex align-items-center gap-2"><i class="fas fa-warehouse opacity-50"></i> {{ blok.nama }}</h6>
                    <div class="fw-bold fs-5">{{ fmt(blok.totalStok) }} <small>Kg</small></div>
                  </div>
                  <span class="badge bg-white text-primary shadow-sm fw-bold">{{ blok.items.length }} Item</span>
                </div>

                <div v-if="activeBlok === blok.nama" class="blok-items">
                  <div v-for="item in blok.items" :key="item.idUnik" class="blok-item-row" @click.stop>
                    <div class="d-flex justify-content-between align-items-center">
                      <div style="min-width:0;flex:1">
                        <div class="fw-bold text-truncate" style="font-size:.85rem; color:var(--text-main)">{{ item.nama }}</div>
                        <div class="small fw-medium text-indigo" style="font-size:.75rem">{{ item.warna || '-' }}</div>
                        <div class="small font-monospace" style="font-size:.7rem; color:var(--text-muted)">{{ item.kodeErp }}</div>
                      </div>
                      <div class="text-end ms-2">
                        <div v-if="isAdmin && editingItem === item.idUnik + blok.nama" class="d-flex gap-1" @click.stop>
                          <input type="number" class="form-control form-control-sm" style="width:70px" v-model="editStokVal" @keydown.enter="simpanStokBlok(item, blok.nama)">
                          <button class="btn btn-xs btn-success" @click.stop="simpanStokBlok(item, blok.nama)"><i class="fas fa-check"></i></button>
                        </div>
                        <div v-else class="fw-bold text-success" style="font-size:.9rem">
                          {{ fmt(item.stokDiBlok) }} Kg
                          <i v-if="isAdmin" class="fas fa-pencil-alt ms-1 text-muted" style="cursor:pointer;font-size:.7rem" @click.stop="bukaEditStok(item, blok.nama)"></i>
                        </div>
                        <!-- Tombol Aksi Admin -->
                        <div v-if="isAdmin" class="d-flex gap-1 mt-2 justify-content-end">
                          <button class="btn btn-xs btn-action btn-in" @click.stop="quickTrans('MASUK', item)"><i class="fas fa-arrow-down"></i></button>
                          <button class="btn btn-xs btn-action btn-out" @click.stop="quickTrans('KELUAR', item)"><i class="fas fa-arrow-up"></i></button>
                          <button class="btn btn-xs btn-action btn-out" @click.stop="hapusDariBlok(item, blok.nama)"><i class="fas fa-trash-alt"></i></button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <!-- Tombol Tambah Item -->
                  <div v-if="isAdmin" class="p-2 border-top bg-light-modern">
                    <button class="btn btn-sm btn-light-action w-100 fw-bold border-dashed" @click.stop="bukaAssignKeBlok(blok.nama)">
                      <i class="fas fa-plus me-1 text-primary"></i> Tambah Item
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer bg-light-modern py-3 border-top">
          <div class="fw-bold text-primary">Grand Total: {{ fmt(grandTotal) }} Kg</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ref as dbRef, set, remove } from 'firebase/database'
import { db } from '../../firebase'
import { dbStok, useStok } from '../../composables/useStok'
import { currentRole } from '../../composables/useAuth'
import { useTrans } from '../../composables/useTrans'
import { useHist } from '../../composables/useHist'
import { masterBlok, loadMasterBlok } from '../../composables/useBlok'

const emit = defineEmits(['close'])
const { bukaTransaksi } = useTrans()
const { bukaRiwayat } = useHist()
const { kirimTransaksi, kirimMutasi } = useStok()

const isAdmin = computed(() => currentRole.value === 'admin')
const showKelolaBlok = ref(false)
const namaBlokBaru = ref('')
const activeBlok = ref('')
const searchBlok = ref('')
const editingItem = ref('')
const editStokVal = ref(0)

const fmt = n => Number(n || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const blokData = computed(() => {
  return masterBlok.value.map(blok => {
    let items = dbStok.value
      .filter(i => i.bloks && (parseFloat(i.bloks[blok.nama]) || 0) !== 0)
      .map(i => ({ ...i, stokDiBlok: parseFloat(i.bloks[blok.nama] || 0) }))

    if (searchBlok.value) {
      const q = searchBlok.value.toLowerCase()
      items = items.filter(i => (i.nama || '').toLowerCase().includes(q) || (i.kodeErp || '').toLowerCase().includes(q) || (i.warna || '').toLowerCase().includes(q))
    }
    return { nama: blok.nama, items, totalStok: items.reduce((s, i) => s + i.stokDiBlok, 0) }
  })
})

const grandTotal = computed(() => dbStok.value.reduce((s, i) => s + (parseFloat(i.stok) || 0), 0))

const tambahBlok = async () => {
  if (!namaBlokBaru.value.trim()) return
  await set(dbRef(db, `master_blok/blok_${Date.now()}`), { nama: namaBlokBaru.value.trim().toUpperCase() })
  namaBlokBaru.value = ''
}

const hapusBlok = async (id) => {
  if (await window.Swal.fire({ title: 'Hapus Blok?', icon: 'warning', showCancelButton: true }).then(r => r.isConfirmed)) {
    await remove(dbRef(db, `master_blok/${id}`))
  }
}

const toggleBlok = nama => { activeBlok.value = activeBlok.value === nama ? '' : nama }
const bukaEditStok = (item, blokNama) => { editingItem.value = item.idUnik + blokNama; editStokVal.value = item.stokDiBlok }
const simpanStokBlok = async (item, blokNama) => {
  await kirimTransaksi(item.idUnik, 'OPNAME', editStokVal.value, 'PENYESUAIAN PETA BLOK', blokNama)
  editingItem.value = ''
}
const quickTrans = (tipe, item) => { emit('close'); setTimeout(() => bukaTransaksi(tipe, item), 300) }
const hapusDariBlok = async (item, blokNama) => {
  if (await window.Swal.fire({ title: 'Hapus dari blok?', icon: 'warning', showCancelButton: true }).then(r => r.isConfirmed)) {
    await kirimMutasi(item.idUnik, item.stokDiBlok, blokNama, 'Tanpa Lokasi')
  }
}

onMounted(() => loadMasterBlok())
</script>

<style scoped>
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
