<template>
  <div class="modal fade show d-block backdrop-blur" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered modal-xl">
      <div class="modal-content modern-modal border-0 shadow-lg">

        <div class="modal-header border-0 pb-0">
          <div class="d-flex align-items-center gap-2">
            <div class="icon-circle bg-primary-subtle text-primary">
              <i class="fas fa-paste"></i>
            </div>
            <h5 class="modal-title fw-bold m-0" style="letter-spacing: -0.5px; color: var(--text-main)">
              Input Massal (Smart Paste)
            </h5>
          </div>
          <button type="button" class="btn-close btn-close-custom" @click="$emit('close')"></button>
        </div>

        <div class="modal-body p-4 pt-3" style="max-height:70vh;overflow-y:auto; overflow-x:hidden;">
          <div class="row g-4" style="padding-bottom: 40px;">

            <div class="col-12">
              <label class="fw-bold mb-2 section-label">
                <span class="step-num">1</span> COPY DATA DARI EXCEL (Tanpa Header)
              </label>
              <textarea
                class="form-control custom-textarea font-monospace"
                rows="3"
                placeholder="Format: [Lot Warna]  [Blok]  [Jumlah]"
                @paste="handlePaste"
              ></textarea>
              <div class="form-text small fw-medium mt-2" style="color: var(--text-muted)">
                <i class="fas fa-info-circle me-1"></i> Paste data 3 Kolom (Lot, Blok, Qty) dari hasil Pivot Excel ke kotak di atas.
              </div>
            </div>

            <div class="col-12 border-top-custom pt-4">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <label class="fw-bold m-0 section-label">
                  <span class="step-num">2</span> PENGATURAN UMUM TRANSAKSI
                </label>
                <button class="btn btn-sm btn-action btn-light-action px-3" style="width:auto; border-radius: 8px;" @click="addEmptyRow">
                  <i class="fas fa-plus me-1 text-primary"></i> Baris Manual
                </button>
              </div>
              
              <div class="row g-3">
                <div class="col-md-2 col-6">
                  <label class="form-label mb-1">Tipe</label>
                  <select class="form-select form-select-sm fw-bold custom-input" v-model="globalTipe">
                    <option value="MASUK">IN (Masuk)</option>
                    <option value="KELUAR">OUT (Keluar)</option>
                    <option value="OPNAME">ADJ (Opname)</option>
                  </select>
                </div>
                
                <div class="col-md-3 col-6">
                  <label class="form-label mb-1">Tanggal & Waktu</label>
                  <input type="datetime-local" class="form-control form-control-sm fw-bold custom-input" v-model="globalDateTime">
                </div>
                
                <div class="col-md-4 col-12">
                  <label class="form-label mb-1">Keterangan (Opsional)</label>
                  <input type="text" class="form-control form-control-sm text-uppercase custom-input"
                         v-model="globalKet" placeholder="Ketik keterangan...">
                </div>
                
                <div class="col-md-3 col-12">
                  <label class="form-label mb-1">Tujuan Blok</label>
                  <select class="form-select form-select-sm fw-bold custom-input" v-model="globalBlok">
                    <option value="">-- Bebas / Tanpa Lokasi --</option>
                    <option v-for="b in masterBlok" :key="b.id" :value="b.nama">{{ b.nama }}</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="col-12 mt-2">
              <div class="table-container shadow-sm">
                <table class="table modern-table mb-0">
                  <thead class="sticky-top" style="z-index: 10;">
                    <tr>
                      <th style="width:4%">#</th>
                      <th style="width:36%">KODE / NAMA BARANG</th>
                      <th style="width:12%">WARNA</th>
                      <th style="width:15%">BLOK (OPSIONAL)</th>
                      <th style="width:13%">QTY (KG)</th>
                      <th style="width:15%">PREVIEW SALDO</th>
                      <th style="width:5%" class="text-center">X</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, idx) in rows" :key="idx" :class="row.itemId ? '' : 'row-warning'">
                      <td class="text-center fw-bold" style="color:var(--text-muted)">{{ idx + 1 }}</td>

                      <td :style="{ position: 'relative', zIndex: activeDrop === idx ? 9999 : 1 }">
                        <input
                          class="form-control form-control-sm fw-bold custom-input table-input"
                          v-model="row.rawKey"
                          placeholder="Ketik/Paste Teks..."
                          autocomplete="off"
                          @input="onInput(row, idx)"
                          @focus="onFocus(idx)"
                          @blur="onBlur(idx)"
                          @keydown.down.prevent="moveDown(idx)"
                          @keydown.up.prevent="moveUp(idx)"
                          @keydown.enter.prevent="pilihSuggestion(idx)"
                          @keydown.escape="activeDrop = -1"
                        >
                        <div v-if="activeDrop === idx && suggestions[idx]?.length" 
                             class="ac-dropdown-new"
                             :class="(idx >= rows.length - 2 && rows.length > 2) ? 'drop-up' : ''">
                          <div
                            v-for="(sug, si) in suggestions[idx]"
                            :key="sug.idUnik"
                            :class="['ac-item-new', highlightIdx[idx] === si ? 'ac-active' : '']"
                            @mousedown.prevent="pilihItem(row, idx, sug)"
                          >
                            <span class="ac-kode">{{ sug.kodeErp }}</span>
                            <span class="ac-sep">|</span>
                            <span class="ac-nama">{{ sug.nama }}</span>
                            <span class="ac-sep">-</span>
                            <span class="ac-warna">{{ sug.warna || '-' }}</span>
                            <span class="ac-stok ms-auto">{{ fmt(sug.stok) }} Kg</span>
                          </div>
                        </div>
                        <div class="status-indicator mt-1" :class="row.itemId ? 'text-success' : 'text-danger'">
                          <i :class="row.itemId ? 'fas fa-check-circle' : 'fas fa-times-circle'"></i>
                          {{ row.itemId ? `Cocok: ${row.kodeErp}` : 'Tidak ditemukan' }}
                        </div>
                      </td>

                      <td class="text-center small fw-bold" style="color:var(--text-muted)">{{ row.warna || '-' }}</td>

                      <td>
                        <select class="form-select form-select-sm fw-bold custom-input table-input py-0 px-2" style="height: 28px;" v-model="row.blok">
                          <option value="">- Tanpa Lokasi -</option>
                          <template v-if="(globalTipe === 'KELUAR' || globalTipe === 'OPNAME') && row.itemId">
                            <option v-for="(stokBlok, blokNama) in getItemBloks(row.itemId)"
                                    :key="'saran-'+blokNama" :value="blokNama">
                              {{ blokNama }} ({{ fmt(stokBlok) }})
                            </option>
                            <option disabled>────────────────</option>
                          </template>
                          <option v-for="b in masterBlok" :key="b.id" :value="b.nama">
                            {{ b.nama }}
                          </option>
                        </select>
                      </td>

                      <td>
                        <input type="number" step="any"
                               class="form-control form-control-sm text-center fw-bold custom-input table-input py-0"
                               style="height: 28px;"
                               v-model="row.qty">
                      </td>

                      <td class="text-center small">
                        <div v-if="row.itemId && row.qty" class="d-flex align-items-center justify-content-center gap-1">
                          <span style="color:var(--text-muted); font-size: 0.7rem;">
                            {{ fmt(getSaldoAwal(row)) }}
                          </span>
                          <i class="fas fa-arrow-right opacity-50" style="font-size:.65rem; color:var(--text-muted)"></i>
                          <span :class="previewSaldo(row) < 0 ? 'text-danger fw-bold' : previewColor" class="fw-bold fs-6">
                            {{ fmt(previewSaldo(row)) }}
                          </span>
                        </div>
                        <span v-else style="color:var(--text-muted)">-</span>
                      </td>

                      <td class="text-center">
                        <button class="btn btn-sm btn-icon-delete" @click="rows.splice(idx, 1)">
                          <i class="fas fa-times"></i>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div class="d-flex justify-content-between align-items-center mt-3 p-3 rounded" style="background: var(--bg-main); border: 1px dashed var(--border-color);">
                <div class="fw-bold d-flex align-items-center gap-2">
                  <div class="icon-circle bg-success-subtle text-success" style="width:28px; height:28px; font-size:0.8rem;">
                    <i class="fas fa-check"></i>
                  </div>
                  <span style="color:var(--text-main)">{{ validCount }} Item Valid</span>
                </div>
                <div class="fw-bold fs-5" style="color:var(--text-main)">
                  <span style="font-size:0.8rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;">TOTAL BERAT: </span>
                  <span class="text-primary">{{ fmt(totalQty) }}</span> <small style="font-size:60%; opacity:0.8;">Kg</small>
                </div>
              </div>
            </div>

          </div>
        </div>

        <div class="modal-footer border-0 p-4 pt-2">
          <button class="btn btn-lg fw-bold w-100 shadow-sm submit-btn"
                  :class="globalTipe === 'MASUK' ? 'btn-in-submit' : globalTipe === 'KELUAR' ? 'btn-out-submit' : 'btn-opname-submit'"
                  :disabled="!validCount || submitting"
                  @click="submit">
            <i v-if="submitting" class="fas fa-circle-notch fa-spin me-2"></i>
            <i v-else class="fas fa-rocket me-2"></i>
            {{ submitting ? 'Memproses Data...' : 'PROSES ' + validCount + ' ITEM SEKARANG' }}
          </button>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch } from 'vue'
import { ref as dbRef, update } from 'firebase/database'
import { db } from '../../firebase'
import { dbStok, useStok } from '../../composables/useStok'
import { masterBlok } from '../../composables/useBlok'

const emit = defineEmits(['close'])
const { refreshData } = useStok()

const getWaktuLokal = () => {
  const tzOffset = (new Date()).getTimezoneOffset() * 60000;
  return (new Date(Date.now() - tzOffset)).toISOString().slice(0, 16);
}

const globalTipe     = ref('MASUK')
const globalDateTime = ref(getWaktuLokal())
const globalKet      = ref('')
const globalBlok     = ref('')
const submitting     = ref(false)
const rows           = ref([])

watch(globalBlok, val => {
  rows.value.forEach(r => { r.blok = val })
})

const activeDrop   = ref(-1)
const suggestions  = reactive({})
const highlightIdx = reactive({})

const fmt = n => Number(n || 0).toLocaleString('id-ID', {
  minimumFractionDigits: 2, maximumFractionDigits: 2
})

const getItemBloks = (itemId) => {
  const item = dbStok.value.find(x => x.idUnik === itemId)
  if (!item?.bloks) return {}
  const activeBloks = {}
  Object.entries(item.bloks).forEach(([k, v]) => {
    if (parseFloat(v) > 0) activeBloks[k] = parseFloat(v)
  })
  return activeBloks
}

const getSaldoAwal = (row) => {
  const item = dbStok.value.find(x => x.idUnik === row.itemId)
  if (!item) return 0
  if (row.blok) {
    return parseFloat(item.bloks?.[row.blok] || 0)
  }
  return parseFloat(item.stok || 0)
}

const previewColor = computed(() => ({
  'text-success': globalTipe.value === 'MASUK',
  'text-danger':  globalTipe.value === 'KELUAR',
  'text-warning': globalTipe.value === 'OPNAME'
}))

const previewSaldo = (row) => {
  const q = parseFloat(row.qty) || 0
  const s = getSaldoAwal(row)
  if (globalTipe.value === 'MASUK')  return s + q
  if (globalTipe.value === 'KELUAR') return s - q
  if (globalTipe.value === 'OPNAME') return q
  return s
}

const validCount = computed(() =>
  rows.value.filter(r => r.itemId && parseFloat(r.qty) > 0).length
)

const totalQty = computed(() =>
  rows.value.reduce((sum, r) => sum + (parseFloat(r.qty) || 0), 0)
)

const cariSuggestions = q => {
  if (!q || q.length < 1) return []
  const tokens = q.toUpperCase().trim().split(/\s+/).filter(Boolean)
  return dbStok.value.filter(i => {
    const haystack = [i.kodeErp || '', i.nama || '', i.warna || ''].join(' ').toUpperCase()
    return tokens.every(token => haystack.includes(token))
  })
  .sort((a, b) => (a.kodeErp || '').localeCompare(b.kodeErp || ''))
  .slice(0, 10)
}

const onInput = (row, idx) => {
  row.itemId = ''; row.kodeErp = ''; row.warna = ''; row.currentStok = 0
  suggestions[idx]  = cariSuggestions(row.rawKey)
  highlightIdx[idx] = -1
  activeDrop.value  = suggestions[idx].length ? idx : -1
}

const onFocus = idx => {
  const row = rows.value[idx]
  if (row.rawKey && !row.itemId) {
    suggestions[idx] = cariSuggestions(row.rawKey)
    if (suggestions[idx].length) activeDrop.value = idx
  }
}

const onBlur = idx => {
  setTimeout(() => { if (activeDrop.value === idx) activeDrop.value = -1 }, 180)
}

const moveDown = idx => {
  const max = (suggestions[idx]?.length || 0) - 1
  highlightIdx[idx] = Math.min((highlightIdx[idx] ?? -1) + 1, max)
}

const moveUp = idx => {
  highlightIdx[idx] = Math.max((highlightIdx[idx] ?? 0) - 1, 0)
}

const pilihSuggestion = idx => {
  const hi = highlightIdx[idx] ?? -1
  if (hi >= 0 && suggestions[idx]?.[hi]) pilihItem(rows.value[idx], idx, suggestions[idx][hi])
}

const pilihItem = (row, idx, item) => {
  row.rawKey      = item.kodeErp
  row.itemId      = item.idUnik
  row.kodeErp     = item.kodeErp
  row.warna       = item.warna || ''
  row.currentStok = parseFloat(item.stok) || 0
  row.blok        = globalBlok.value || '' 
  activeDrop.value  = -1
  suggestions[idx]  = []
  highlightIdx[idx] = -1
}

const fuzzyMatch = rawKey => {
  const val    = rawKey.toUpperCase().trim()
  const tokens = val.split(/\s+/).filter(Boolean)
  return dbStok.value.find(i => i.kodeErp.toUpperCase() === val) ||
         dbStok.value.find(i => (i.nama || '').toUpperCase() === val) ||
         dbStok.value.find(i => {
           const h = [i.kodeErp || '', i.nama || '', i.warna || ''].join(' ').toUpperCase()
           return tokens.every(t => h.includes(t))
         }) || null
}

const addEmptyRow = () => {
  rows.value.push({
    rawKey: '', itemId: '', kodeErp: '', warna: '',
    qty: '', currentStok: 0, blok: globalBlok.value || ''
  })
}

// LOGIKA SMART PASTE SESUAI GAMBAR PIVOT: LOT - BLOK - QTY
const handlePaste = e => {
  e.preventDefault()
  const pasted = (e.clipboardData || window.clipboardData).getData('text')
  rows.value = []

  pasted.split(/\r\n|\n|\r/).forEach(line => {
    if (!line.trim()) return

    // Pecah data berdasarkan Tab (bawaan Excel)
    let cols = line.split('\t')
    if (cols.length === 1) cols = line.split(',')
    if (cols.length === 1) cols = line.split(/\s{2,}/)

    // AMBIL DATA SESUAI URUTAN GAMBAR: [0]=Lot, [1]=Blok, [2]=Qty
    const rawKey  = (cols[0] || '').trim()
    const rawBlok = (cols[1] || '').trim()
    const rawQty  = (cols[2] || '').trim()

    if (!rawKey) return // Abaikan kalau nama barang kosong

    // Bersihkan Qty: Ubah koma jadi titik biar bisa dijumlahkan
    let cleanQty = rawQty.replace(/,/g, '.')
    const qty = parseFloat(cleanQty)

    // Bersihkan Blok: Kalau isinya '0', anggap kosong (Tanpa Lokasi)
    const blokFinal = (rawBlok === '0') ? '' : rawBlok

    // Cari barang di database
    const item = fuzzyMatch(rawKey)

    rows.value.push({
      rawKey,
      itemId:      item ? item.idUnik  : '',
      kodeErp:     item ? item.kodeErp : '',
      warna:       item ? item.warna   : '',
      currentStok: item ? parseFloat(item.stok) || 0 : 0,
      qty:         isNaN(qty) ? '' : qty,
      // Masukkan Blok hasil paste, kalau kosong pakai Tujuan Blok Global
      blok:        blokFinal ? blokFinal : (globalBlok.value || '')
    })
  })
}

for (let i = 0; i < 5; i++) addEmptyRow()

const submit = async () => {
  const valid = rows.value.filter(r => r.itemId && parseFloat(r.qty) > 0)
  if (!valid.length) return

  const confirm = await window.Swal.fire({
    title: `Proses ${valid.length} Item?`,
    html: `Tipe: <b>${globalTipe.value}</b><br>Total: <b>${fmt(totalQty.value)} Kg</b>`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#4f46e5',
    confirmButtonText: 'Ya, Proses!'
  })
  if (!confirm.isConfirmed) return

  submitting.value = true
  try {
    const updates = {}
    let base = new Date(globalDateTime.value || Date.now())
    if (isNaN(base.getTime())) base = new Date()

    const pendingBloks = {}
    const pendingStok = {}

    valid.forEach((row, i) => {
      const item = dbStok.value.find(x => x.idUnik === row.itemId)
      if (!item) return

      const qty = parseFloat(row.qty)
      const blokNama = row.blok || ''
      
      if (!pendingBloks[row.itemId]) {
        pendingBloks[row.itemId] = { ...(item.bloks || {}) }
        pendingStok[row.itemId] = parseFloat(item.stok || 0)
      }

      const bloks = pendingBloks[row.itemId]
      let currentStok = pendingStok[row.itemId]

      if (globalTipe.value === 'MASUK') {
        currentStok += qty
        if (blokNama) {
          bloks[blokNama] = parseFloat(((bloks[blokNama] || 0) + qty).toFixed(2))
        }
      } else if (globalTipe.value === 'KELUAR') {
        currentStok -= qty
        if (blokNama) {
          bloks[blokNama] = parseFloat(((bloks[blokNama] || 0) - qty).toFixed(2))
        }
      } else if (globalTipe.value === 'OPNAME') {
        if (blokNama) {
          const stokBlokLama = parseFloat(bloks[blokNama] || 0)
          const selisih = qty - stokBlokLama
          currentStok += selisih
          bloks[blokNama] = qty
        } else {
          currentStok = qty
        }
      }

currentStok = parseFloat(currentStok.toFixed(2))

      // Hanya hapus lokasi blok JIKA stoknya persis 0 (kosong).
      // JIKA stoknya minus (< 0), blok akan tetap disimpan dan ditampilkan minus.
      if (blokNama && bloks[blokNama] === 0) {
        delete bloks[blokNama]
      }

      pendingStok[row.itemId] = currentStok

      const iso   = new Date(base.getTime() + i * 1000).toISOString()
      const trxId = 'BCH_' + (base.getTime() + i * 1000)

      updates[`stok_benang/${row.itemId}/stok`]      = currentStok
      updates[`stok_benang/${row.itemId}/bloks`]     = Object.keys(bloks).length ? bloks : null
      updates[`stok_benang/${row.itemId}/tglUpdate`] = iso
      
      updates[`riwayat_transaksi/${row.itemId}/${trxId}`] = {
        trxId, kodeErp: item.kodeErp, qty,
        stokAkhir: currentStok, tanggal: iso,
        tipe: globalTipe.value, blok: blokNama,
        keterangan: (globalKet.value || 'BULK').toUpperCase()
      }
    })

    await update(dbRef(db), updates)
    window.Swal.fire({
      icon: 'success', title: 'Sukses!',
      text: `${valid.length} item diproses.`,
      timer: 1500, showConfirmButton: false
    })
    refreshData()
    emit('close')
  } catch(e) {
    window.Swal.fire('Error', e.message, 'error')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.backdrop-blur { background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); }

.modern-modal {
  border-radius: 24px; background: var(--bg-main); overflow: hidden;
}

.icon-circle {
  width: 40px; height: 40px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center; font-size: 1.2rem;
}

.bg-primary-subtle { background: rgba(79, 70, 229, 0.1); }
.text-primary { color: #4f46e5 !important; }
.bg-success-subtle { background: rgba(16, 185, 129, 0.1); }
.text-success { color: #10b981 !important; }

.btn-close-custom {
  background: transparent url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%2364748b'%3e%3cpath d='M.293.293a1 1 0 0 1 1.414 0L8 6.586 14.293.293a1 1 0 1 1 1.414 1.414L9.414 8l6.293 6.293a1 1 0 0 1-1.414 1.414L8 9.414l-6.293 6.293a1 1 0 0 1-1.414-1.414L6.586 8 .293 1.707a1 1 0 0 1 0-1.414z'/%3e%3c/svg%3e") center/1em auto no-repeat;
  border: none; width: 32px; height: 32px; opacity: 0.5; transition: opacity 0.2s; cursor:pointer;
}
.btn-close-custom:hover { opacity: 1; }

.section-label { font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
.step-num { 
  display:inline-block; width: 20px; height: 20px; line-height: 20px; text-align: center;
  background: #4f46e5; color: white; border-radius: 50%; font-size: 0.7rem; margin-right: 4px;
}

.custom-textarea {
  background: var(--bg-card); color: var(--text-main);
  border: 2px dashed var(--border-color); border-radius: 12px;
  padding: 16px; font-size: 0.85rem; min-height: 100px; resize: vertical; transition: all 0.3s;
}
.custom-textarea:focus { border-color: #818cf8; box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1); outline: none; }
.custom-textarea::placeholder { color: var(--text-muted); opacity: 0.5; }

.border-top-custom { border-top: 1px dashed var(--border-color); }
.form-label { font-size: 0.7rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;}

.custom-input {
  background: var(--bg-card); color: var(--text-main);
  border: 1px solid var(--border-color); border-radius: 8px;
}
.custom-input:focus { border-color: #818cf8; box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1); outline: none; }
.custom-addon { background: var(--bg-main); color: var(--text-muted); border: 1px solid var(--border-color); }

.table-container { border-radius: 12px; border: 1px solid var(--border-color); overflow: visible; }

.modern-table th { background: var(--bg-main); color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid var(--border-color); padding: 12px 8px; }
.modern-table th:first-child { border-top-left-radius: 12px; }
.modern-table th:last-child { border-top-right-radius: 12px; }

.modern-table td { background: var(--bg-card); border-bottom: 1px solid var(--border-color); vertical-align: middle; padding: 8px;}
.row-warning td { background: rgba(245, 158, 11, 0.05); }

.table-input { border-color: transparent; background: transparent; padding: 4px; }
.table-input:focus { border-color: #818cf8; background: var(--bg-main); }

.btn-icon-delete { color: var(--text-muted); transition: color 0.2s; }
.btn-icon-delete:hover { color: #ef4444; }

.status-indicator { font-size: 0.65rem; font-weight: 600; }

.ac-dropdown-new {
  position: absolute; top: calc(100% + 2px); left: 0; right: 0;
  background: var(--bg-card); border: 1px solid #818cf8;
  border-radius: 8px; z-index: 9999; max-height: 200px; overflow-y: auto;
  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.2);
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

.ac-dropdown-new.drop-up {
  top: auto; 
  bottom: calc(100% + 4px);
  box-shadow: 0 -10px 25px -5px rgba(0,0,0,0.2);
}

.ac-dropdown-new::-webkit-scrollbar { width: 6px; }
.ac-dropdown-new::-webkit-scrollbar-track { background: transparent; }
.ac-dropdown-new::-webkit-scrollbar-thumb { background: rgba(100, 116, 139, 0.4); border-radius: 10px; }
.ac-dropdown-new::-webkit-scrollbar-thumb:hover { background: rgba(100, 116, 139, 0.7); }

.ac-item-new {
  padding: 8px 12px; cursor: pointer; font-size: 0.8rem;
  border-bottom: 1px solid var(--border-color); display: flex; align-items: center; gap: 6px;
}
.ac-item-new:last-child { border-bottom: none; }
.ac-item-new:hover, .ac-active { background: var(--bg-main); }
.ac-kode  { font-weight: 700; color: #4f46e5; min-width: 100px; font-family: monospace; }
.ac-nama  { color: var(--text-main); flex: 1; font-size: .75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;}
.ac-sep   { color: var(--text-muted); opacity: 0.5; }
.ac-warna { color: var(--text-muted); font-size: .75rem; }
.ac-stok  { font-weight: 700; color: #10b981; font-size: .75rem; white-space: nowrap; }

.submit-btn { border-radius: 14px; padding: 16px; font-size: 1rem; color: #fff; border: none; transition: transform 0.2s;}
.submit-btn:hover:not(:disabled) { transform: translateY(-2px); }
.btn-in-submit { background: linear-gradient(135deg, #10b981, #059669); }
.btn-out-submit { background: linear-gradient(135deg, #ef4444, #dc2626); }
.btn-opname-submit { background: linear-gradient(135deg, #f59e0b, #d97706); }
</style>
