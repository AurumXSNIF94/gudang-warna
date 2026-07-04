<template>
  <div class="modal fade show d-block backdrop-blur" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered modal-xl">
      <div class="modal-content modern-modal border-0 shadow-lg">

        <div class="modal-header border-0 pb-3">
          <div class="w-100">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h5 class="modal-title fw-bold d-flex align-items-center gap-2 m-0" style="color: var(--text-main);">
                <div class="icon-circle bg-warning-subtle text-warning">
                  <i class="fas fa-balance-scale"></i>
                </div>
                Audit Selisih Fisik (Input Massal)
              </h5>
              <button type="button" class="btn-close btn-close-custom" @click="$emit('close')"></button>
            </div>
          </div>
        </div>

        <div class="modal-body p-4 pt-0" style="max-height: 70vh; overflow-y: auto; overflow-x: hidden;">
          <div class="row g-4">
            
            <div class="col-12">
              <label class="fw-bold mb-2 section-label">
                <span class="step-num">1</span> PASTE DATA DARI EXCEL (2 Kolom: Kode ERP & Qty Fisik)
              </label>
              <textarea
                class="form-control custom-textarea font-monospace"
                rows="3"
                placeholder="Format Excel: [Kode ERP / Lot] [Jumlah Fisik Timbangan]"
                @paste="handlePaste"
              ></textarea>
              <div class="form-text small fw-medium mt-2" style="color: var(--text-muted)">
                <i class="fas fa-info-circle me-1"></i> Cukup blok 2 kolom di Excel (Kode & Qty Fisik), lalu tekan CTRL+V di kotak atas.
              </div>
            </div>

            <div class="col-12 border-top-custom pt-3">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <label class="fw-bold m-0 section-label">
                  <span class="step-num">2</span> HASIL PERBANDINGAN STOK & SELISIH FISIK
                </label>
                <button class="btn btn-sm btn-light-action px-3 fw-bold" style="border-radius: 8px;" @click="addEmptyRow">
                  <i class="fas fa-plus me-1 text-primary"></i> Tambah Baris Manual
                </button>
              </div>

              <div class="table-container shadow-sm">
                <table class="table modern-table mb-0">
                  <thead class="sticky-top" style="z-index: 10;">
                    <tr>
                      <th style="width: 4%">#</th>
                      <th style="width: 30%">KODE / KUNCI BARANG</th>
                      <th style="width: 15%">WARNA</th>
                      <th style="width: 15%" class="text-end">STOK SISTEM</th>
                      <th style="width: 15%" class="text-center">FISIK (TIMBANGAN)</th>
                      <th style="width: 16%" class="text-end">SELISIH</th>
                      <th style="width: 5%" class="text-center">X</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, idx) in rows" :key="idx" :class="row.itemId ? '' : 'row-warning'">
                      <td class="text-center fw-bold text-muted">{{ idx + 1 }}</td>

                      <td :style="{ position: 'relative', zIndex: activeDrop === idx ? 9999 : 1 }">
                        <input
                          class="form-control form-control-sm fw-bold custom-input table-input"
                          v-model="row.rawKey"
                          placeholder="Ketik/Paste Kode..."
                          autocomplete="off"
                          @input="onInput(row, idx)"
                          @focus="onFocus(idx)"
                          @blur="onBlur(idx)"
                          @keydown.down.prevent="moveDown(idx)"
                          @keydown.up.prevent="moveUp(idx)"
                          @keydown.enter.prevent="pilihSuggestion(idx)"
                        >
                        <div v-if="activeDrop === idx && suggestions[idx]?.length" class="ac-dropdown-new">
                          <div v-for="(sug, si) in suggestions[idx]" :key="sug.idUnik"
                               :class="['ac-item-new', highlightIdx[idx] === si ? 'ac-active' : '']"
                               @mousedown.prevent="pilihItem(row, idx, sug)">
                            <span class="ac-kode">{{ sug.kodeErp }}</span>
                            <span class="ac-sep">|</span>
                            <span class="ac-nama">{{ sug.nama }}</span>
                            <span class="ac-stok ms-auto">{{ fmt(sug.stok) }} Kg</span>
                          </div>
                        </div>
                        <div class="status-indicator mt-1" :class="row.itemId ? 'text-success' : 'text-danger'">
                          <i :class="row.itemId ? 'fas fa-check-circle' : 'fas fa-times-circle'"></i>
                          {{ row.itemId ? `Cocok: ${row.nama}` : 'Barang tidak ditemukan' }}
                        </div>
                      </td>

                      <td class="small fw-bold text-muted text-truncate" style="max-width: 150px;">
                        {{ row.warna || '-' }}
                      </td>

                      <td class="text-end fw-bold text-secondary fs-6">
                        {{ row.itemId ? fmt(row.stokSistem) + ' Kg' : '-' }}
                      </td>

                      <td>
                        <input type="number" step="any"
                               class="form-control form-control-sm text-center fw-bold custom-input table-input py-0 bg-warning-subtle border-warning-subtle"
                               style="height: 28px;"
                               placeholder="0.00"
                               v-model="row.qtyFisik">
                      </td>

                      <td class="text-end fw-bold fs-6">
                        <div v-if="row.itemId && row.qtyFisik !== ''">
                          <span :class="getSelisih(row) < 0 ? 'text-danger' : getSelisih(row) > 0 ? 'text-success' : 'text-muted'">
                            {{ getSelisihTeks(row) }} Kg
                          </span>
                        </div>
                        <span v-else class="text-muted">-</span>
                      </td>

                      <td class="text-center">
                        <button class="btn btn-sm btn-icon-delete border-0 bg-transparent" @click="rows.splice(idx, 1)">
                          <i class="fas fa-times"></i>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>

        <div class="modal-footer border-0 p-4 pt-2 d-flex flex-column gap-3">
          <div class="d-flex justify-content-between w-100 p-2 rounded" style="background: var(--bg-main)">
            <div class="fw-bold small text-muted">Total Baris Cocok: <span class="text-success fs-6">{{ validCount }}</span></div>
            <div class="fw-bold small text-muted">Total Akumulasi Selisih Fisik: 
              <span :class="totalSelisih < 0 ? 'text-danger' : 'text-success'" class="fs-5 ms-1">{{ fmt(totalSelisih) }} Kg</span>
            </div>
          </div>
          
          <button class="btn btn-lg fw-bold w-100 shadow-sm btn-opname-submit text-white"
                  :disabled="!validCount || submitting"
                  @click="submitOpnameMassal">
            <i v-if="submitting" class="fas fa-circle-notch fa-spin me-2"></i>
            <i v-else class="fas fa-check-double me-2"></i>
            {{ submitting ? 'Menyesuaikan Database...' : 'PROSES PENYESUAIAN ' + validCount + ' FISIK ITEM' }}
          </button>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { ref as dbRef, update } from 'firebase/database'
import { db } from '../../firebase'
import { dbStok, useStok } from '../../composables/useStok'

const emit = defineEmits(['close'])
const { refreshData } = useStok()

const submitting = ref(false)
const rows = ref([])
const activeDrop = ref(-1)
const suggestions = reactive({})
const highlightIdx = reactive({})

const fmt = n => Number(n || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const validCount = computed(() => rows.value.filter(r => r.itemId && r.qtyFisik !== '').length)

// Hitung nilai selisih per baris
const getSelisih = (row) => {
  const fisik = parseFloat(row.qtyFisik) || 0
  const sistem = parseFloat(row.stokSistem) || 0
  return fisik - sistem
}

const getSelisihTeks = (row) => {
  const val = getSelisih(row)
  return val > 0 ? `+${fmt(val)}` : fmt(val)
}

// Akumulasi total seluruh selisih di tabel
const totalSelisih = computed(() => {
  return rows.value.reduce((sum, r) => {
    if (!r.itemId || r.qtyFisik === '') return sum
    return sum + getSelisih(r)
  }, 0)
})

const addEmptyRow = () => {
  rows.value.push({ rawKey: '', itemId: '', kodeErp: '', nama: '', warna: '', qtyFisik: '', stokSistem: 0 })
}

// FORMAT PASTE: KODE_ERP [TAB] QTY_FISIK
const handlePaste = (e) => {
  e.preventDefault()
  const pasted = (e.clipboardData || window.clipboardData).getData('text')
  rows.value = []

  pasted.split(/\r\n|\n|\r/).forEach(line => {
    if (!line.trim()) return
    let cols = line.split('\t')
    if (cols.length === 1) cols = line.split(',')
    if (cols.length === 1) cols = line.split(/\s{2,}/)

    const rawKey = (cols[0] || '').trim()
    const rawQty = (cols[1] || '').trim()
    if (!rawKey) return

    let cleanQty = rawQty.replace(/,/g, '.')
    const qtyFisik = parseFloat(cleanQty)

    // Match ke database
    const item = dbStok.value.find(i => (i.kodeErp || '').toUpperCase() === rawKey.toUpperCase() || (i.nama || '').toUpperCase() === rawKey.toUpperCase())

    rows.value.push({
      rawKey,
      itemId: item ? item.idUnik : '',
      kodeErp: item ? item.kodeErp : '',
      nama: item ? item.nama : '',
      warna: item ? item.warna : '',
      stokSistem: item ? parseFloat(item.stok) || 0 : 0,
      qtyFisik: isNaN(qtyFisik) ? '' : qtyFisik
    })
  })
}

// Logika Autocomplete Manual jika diketik
const cariSuggestions = q => {
  if (!q) return []
  const tokens = q.toUpperCase().trim().split(/\s+/)
  return dbStok.value.filter(i => {
    const h = [i.kodeErp || '', i.nama || '', i.warna || ''].join(' ').toUpperCase()
    return tokens.every(t => h.includes(t))
  }).slice(0, 10)
}

const onInput = (row, idx) => {
  row.itemId = ''; row.kodeErp = ''; row.nama = ''; row.warna = ''; row.stokSistem = 0
  suggestions[idx] = cariSuggestions(row.rawKey)
  highlightIdx[idx] = -1
  activeDrop.value = suggestions[idx].length ? idx : -1
}

const onFocus = idx => {
  const row = rows.value[idx]
  if (row.rawKey && !row.itemId) {
    suggestions[idx] = cariSuggestions(row.rawKey)
    if (suggestions[idx].length) activeDrop.value = idx
  }
}

const onBlur = idx => { setTimeout(() => { if (activeDrop.value === idx) activeDrop.value = -1 }, 180) }

const pilihItem = (row, idx, item) => {
  row.rawKey = item.kodeErp
  row.itemId = item.idUnik
  row.kodeErp = item.kodeErp
  row.nama = item.nama
  row.warna = item.warna || ''
  row.stokSistem = parseFloat(item.stok) || 0
  activeDrop.value = -1
}

// Kunci eksekusi massal menimpa database (OPNAME STRATEGY)
const submitOpnameMassal = async () => {
  const valid = rows.value.filter(r => r.itemId && r.qtyFisik !== '')
  if (!valid.length) return

  const confirm = await window.Swal.fire({
    title: `Proses Penyesuaian ${valid.length} Item?`,
    html: `Stok lama di sistem akan langsung digantikan dengan data berat timbangan fisik baru.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#f59e0b',
    confirmButtonText: 'Ya, Eksekusi!'
  })
  if (!confirm.isConfirmed) return

  submitting.value = true
  try {
    const updates = {}
    const nowIso = new Date().toISOString()
    const baseTime = Date.now()

    valid.forEach((row, i) => {
      const item = dbStok.value.find(x => x.idUnik === row.itemId)
      if (!item) return

      const qtyFisikBaru = parseFloat(row.qtyFisik)
      const trxId = 'BCH_OPN_' + (baseTime + i)

      // Timpa stok total utama dengan nilai timbangan fisik baru
      updates[`stok_benang/${row.itemId}/stok`] = qtyFisikBaru
      updates[`stok_benang/${row.itemId}/tglUpdate`] = nowIso

      // Catat ke log riwayat transaksi sebagai OPNAME
      updates[`riwayat_transaksi/${row.itemId}/${trxId}`] = {
        trxId,
        kodeErp: item.kodeErp,
        qty: qtyFisikBaru,
        stokAkhir: qtyFisikBaru,
        tanggal: nowIso,
        tipe: 'OPNAME',
        blok: '', // Penyesuaian global utama
        keterangan: 'OPNAME MASAL FISIK'
      }
    })

    await update(dbRef(db), updates)
    window.Swal.fire({ icon: 'success', title: 'Database Berhasil Disinkronkan!', timer: 1500, showConfirmButton: false })
    refreshData()
    emit('close')
  } catch (e) {
    window.Swal.fire('Error', e.message, 'error')
  } finally {
    submitting.value = false
  }
}

// Inisialisasi baris kosong di awal modal buka
for (let i = 0; i < 5; i++) addEmptyRow()
</script>

<style scoped>
.modern-modal { border-radius: 24px; background: var(--bg-card); overflow: hidden; }
.backdrop-blur { background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); }
.icon-circle { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
.bg-warning-subtle { background: rgba(245, 158, 11, 0.15); color: #d97706; }

.section-label { font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
.step-num { display: inline-block; width: 20px; height: 20px; line-height: 20px; text-align: center; background: #f59e0b; color: white; border-radius: 50%; font-size: 0.7rem; margin-right: 4px; }

.custom-textarea { background: var(--bg-card); color: var(--text-main); border: 2px dashed var(--border-color); border-radius: 12px; padding: 16px; font-size: 0.85rem; }
.custom-textarea:focus { border-color: #f59e0b; box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.1); outline: none; }
.border-top-custom { border-top: 1px dashed var(--border-color); }

.table-container { border-radius: 12px; border: 1px solid var(--border-color); }
.modern-table th { background: var(--bg-main); color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; padding: 12px 8px; border-bottom: 2px solid var(--border-color); }
.modern-table td { background: var(--bg-card); border-bottom: 1px solid var(--border-color); vertical-align: middle; padding: 8px; }
.row-warning td { background: rgba(245, 158, 11, 0.03); }

.table-input { border-color: transparent; background: transparent; padding: 4px; }
.table-input:focus { border-color: #818cf8; background: var(--bg-main); }
.bg-warning-subtle { background: rgba(245, 158, 11, 0.08) !important; color: var(--text-main); }

.btn-icon-delete { color: var(--text-muted); }
.btn-icon-delete:hover { color: #ef4444; }
.status-indicator { font-size: 0.65rem; font-weight: 600; }

.ac-dropdown-new { position: absolute; top: calc(100% + 2px); left: 0; right: 0; background: var(--bg-card); border: 1px solid #f59e0b; border-radius: 8px; z-index: 9999; max-height: 200px; overflow-y: auto; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.2); }
.ac-item-new { padding: 8px 12px; cursor: pointer; font-size: 0.8rem; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; gap: 6px; }
.ac-item-new:hover, .ac-active { background: var(--bg-main); }
.ac-kode { font-weight: 700; color: #f59e0b; min-width: 100px; }
.ac-nama { color: var(--text-main); flex: 1; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; }
.ac-stok { font-weight: 700; color: #10b981; }

.btn-opname-submit { background: linear-gradient(135deg, #f59e0b, #d97706); border: none; padding: 14px; border-radius: 12px; }
.btn-opname-submit:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.05); }
.btn-light-action { background: var(--bg-main); color: var(--text-muted); border: 1px solid var(--border-color); }
.btn-light-action:hover { background: var(--border-color); color: var(--text-main); }
</style>
