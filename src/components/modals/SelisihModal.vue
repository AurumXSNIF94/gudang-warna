<template>
  <div class="modal fade show d-block backdrop-blur" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered modal-xl">
      <div class="modal-content modern-modal border-0 shadow-lg">

        <!-- HEADER -->
        <div class="modal-header border-0 pb-3">
          <div class="w-100">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h5 class="modal-title fw-bold d-flex align-items-center gap-2 m-0" style="color: var(--text-main);">
                <div class="icon-circle bg-primary-subtle text-primary">
                  <i class="fas fa-server"></i>
                </div>
                Cek Selisih vs ERP (Smart Paste)
              </h5>
              <button type="button" class="btn-close btn-close-custom" @click="$emit('close')"></button>
            </div>
            <p class="text-muted small mb-0 mt-1">Bandingkan total stok di Aplikasi ini dengan data mutasi dari sistem ERP pusat.</p>
          </div>
        </div>

        <!-- BODY -->
        <div class="modal-body p-4 pt-0" style="max-height: 70vh; overflow-y: auto; overflow-x: hidden;">
          <div class="row g-4">
            
            <!-- STEP 1: TANGGAL & PASTE BOX -->
            <div class="col-12">
              <div class="d-flex justify-content-between align-items-end mb-2">
                <label class="fw-bold section-label text-primary m-0">
                  <span class="step-num bg-primary">1</span> PASTE DATA DARI EXCEL ERP (2 Kolom)
                </label>
                <div class="d-flex align-items-center gap-2">
                  <label class="small fw-bold text-muted m-0">Tanggal Penyesuaian:</label>
                  <input type="datetime-local" class="form-control form-control-sm fw-bold border-primary-subtle" 
                         style="width: 200px; background: var(--bg-card); color: var(--text-main);"
                         v-model="tanggalOpname">
                </div>
              </div>
              <!-- 🔥 v-model ditambahkan biar otomatis ke-trigger saat dipaste atau diedit manual 🔥 -->
              <textarea
                class="form-control custom-textarea font-monospace"
                rows="3"
                v-model="rawPasteText"
                placeholder="Format Excel: [Kode ERP] [Total Qty di ERP]"
              ></textarea>
              <div class="form-text small fw-medium mt-2" style="color: var(--text-muted)">
                <i class="fas fa-info-circle me-1"></i> Blok 2 kolom di Excel ERP (Kode ERP & Qty), lalu tekan CTRL+V di sini. Data akan otomatis dihitung ke stok tanggal yang dipilih.
              </div>
            </div>

            <!-- STEP 2: TABEL COMPARISON PREVIEW -->
            <div class="col-12 border-top-custom pt-3">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <label class="fw-bold m-0 section-label text-primary">
                  <span class="step-num bg-primary">2</span> HASIL PERBANDINGAN
                </label>
                <button class="btn btn-sm btn-success px-3 fw-bold shadow-sm" style="border-radius: 8px;" @click="exportExcel" :disabled="!rows.length">
                  <i class="fas fa-file-excel me-1"></i> Export Excel
                </button>
              </div>

              <div class="table-container shadow-sm">
                <table class="table modern-table mb-0 align-middle">
                  <thead class="sticky-top" style="z-index: 10;">
                    <tr>
                      <th style="width: 5%" class="text-center">#</th>
                      <th style="width: 25%">KODE ERP</th>
                      <th style="width: 25%">NAMA BARANG</th>
                      <th style="width: 15%" class="text-center">STOK APLIKASI</th>
                      <th style="width: 15%" class="text-center">STOK ERP</th>
                      <th style="width: 15%" class="text-end">SELISIH</th>
                    </tr>
                  </thead>
                  <tbody>
                    <template v-if="loadingHistory">
                      <tr>
                        <td colspan="6" class="text-center py-5">
                          <div class="spinner-border text-primary"></div>
                          <div class="mt-2 small fw-bold text-muted">Menarik Riwayat Masa Lalu...</div>
                        </td>
                      </tr>
                    </template>
                    <template v-else-if="rows.length">
                      <tr v-for="(row, idx) in rows" :key="idx" :class="!row.itemId ? 'row-warning' : getSelisih(row) !== 0 ? 'row-danger' : ''">
                        <td class="text-center fw-bold text-muted">{{ idx + 1 }}</td>
                        
                        <td class="font-monospace fw-bold" :class="row.itemId ? 'text-primary' : 'text-danger'">
                          {{ row.kodeErp }}
                          <div v-if="!row.itemId" class="small text-danger mt-1" style="font-size: 0.65rem;">
                            <i class="fas fa-exclamation-triangle"></i> Tidak ada di Aplikasi
                          </div>
                        </td>
                        
                        <td class="fw-bold text-truncate" style="max-width: 200px;">
                          {{ row.nama || 'Tidak Diketahui' }}
                          <div v-if="row.warna" class="small text-muted fw-normal">{{ row.warna }}</div>
                        </td>
                        
                        <td class="text-center fw-bold text-secondary fs-6">
                          {{ row.itemId ? fmt(row.stokApp) : '-' }}
                        </td>
                        
                        <td class="text-center">
                          <span class="badge bg-light text-dark border px-3 py-2 fs-6 shadow-sm">
                            {{ fmt(row.stokErp) }}
                          </span>
                        </td>
                        
                        <td class="text-end fw-bold fs-5">
                          <span v-if="row.itemId" :class="selisihColor(row)">
                            {{ selisihTeks(row) }}
                          </span>
                          <span v-else class="text-muted">-</span>
                        </td>
                      </tr>
                    </template>
                    <template v-else>
                      <tr>
                        <td colspan="6" class="text-center text-muted py-5">
                          <i class="fas fa-clipboard-list fs-2 mb-2 opacity-50"></i><br>
                          Belum ada data yang di-paste.
                        </td>
                      </tr>
                    </template>
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>

        <!-- FOOTER SUMMARY & SUBMIT -->
        <div class="modal-footer border-0 p-4 pt-2 d-flex flex-column gap-3">
          <div class="d-flex justify-content-between w-100 p-3 rounded" style="background: var(--bg-main); border: 1px dashed var(--border-color);">
            <div class="d-flex gap-4">
              <div class="fw-bold small text-muted">Total Baris: <span class="text-primary fs-6">{{ rows.length }}</span></div>
              <div class="fw-bold small text-muted">Baris Bermasalah: <span class="text-danger fs-6">{{ errorCount }}</span></div>
            </div>
            <div class="fw-bold small text-muted">Total Selisih Akumulasi: 
              <span :class="totalSelisih < 0 ? 'text-danger' : totalSelisih > 0 ? 'text-success' : 'text-muted'" class="fs-5 ms-1">
                {{ totalSelisih > 0 ? '+' : '' }}{{ fmt(totalSelisih) }} Kg
              </span>
            </div>
          </div>
          
          <div class="d-flex w-100 gap-2">
            <button class="btn btn-light-action fw-bold px-4" @click="$emit('close')">Tutup</button>
            <button class="btn btn-primary fw-bold flex-grow-1 shadow-sm"
                    :disabled="!rows.length || submitting || errorCount === 0 || loadingHistory"
                    @click="sesuaikanKeErp">
              <i v-if="submitting" class="fas fa-circle-notch fa-spin me-2"></i>
              <i v-else class="fas fa-sync-alt me-2"></i>
              {{ submitting ? 'Mensinkronkan...' : 'SINKRONKAN APLIKASI AGAR SAMA DENGAN ERP' }}
            </button>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
// 🔥 Import tambahan: onMounted, watch, dan get
import { ref, computed, onMounted, watch } from 'vue'
import { ref as dbRef, update, get } from 'firebase/database'
import { db } from '../../firebase'
import { dbStok, useStok } from '../../composables/useStok'

const emit = defineEmits(['close'])
// 🔥 Tambahkan jalankanAudit untuk memperbaiki stok pasca sinkronisasi masa lalu
const { refreshData, jalankanAudit } = useStok()

const submitting = ref(false)
const rows = ref([])
const rawPasteText = ref('')
const allHistories = ref({})
const loadingHistory = ref(false)

const getWaktuLokal = () => {
  const tzOffset = (new Date()).getTimezoneOffset() * 60000
  return (new Date(Date.now() - tzOffset)).toISOString().slice(0, 16)
}
const tanggalOpname = ref(getWaktuLokal())

// Tarik semua riwayat transaksi ke memori saat modal dibuka biar kalkulasi tanggal secepat kilat
onMounted(async () => {
  loadingHistory.value = true
  try {
    const snap = await get(dbRef(db, 'riwayat_transaksi'))
    allHistories.value = snap.val() || {}
  } catch (error) {
    console.error("Gagal menarik riwayat:", error)
  } finally {
    loadingHistory.value = false
  }
})

const fmt = n => Number(n || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const getSelisih = (row) => {
  if (!row.itemId) return 0
  const erp = parseFloat(row.stokErp) || 0
  const app = parseFloat(row.stokApp) || 0
  return erp - app
}

const selisihColor = (row) => {
  const val = getSelisih(row)
  if (val > 0) return 'text-success'
  if (val < 0) return 'text-danger'
  return 'text-muted'
}

const selisihTeks = (row) => {
  const val = getSelisih(row)
  return val > 0 ? `+${fmt(val)}` : fmt(val)
}

const errorCount = computed(() => {
  return rows.value.filter(r => !r.itemId || getSelisih(r) !== 0).length
})

const totalSelisih = computed(() => {
  return rows.value.reduce((sum, r) => sum + getSelisih(r), 0)
})

// 🔥 LOGIKA BARU: Cari stok tepat di detik tanggalOpname 🔥
const processData = () => {
  if (!rawPasteText.value.trim()) {
    rows.value = []
    return
  }

  const targetTime = new Date(tanggalOpname.value).getTime()
  const tempRows = []

  rawPasteText.value.split(/\r\n|\n|\r/).forEach(line => {
    if (!line.trim()) return
    let cols = line.split('\t')
    if (cols.length === 1) cols = line.split(',')
    if (cols.length === 1) cols = line.split(/\s{2,}/)

    const rawKey = (cols[0] || '').trim()
    const rawQty = (cols[1] || '').trim()
    if (!rawKey) return

    let cleanQty = rawQty.replace(/,/g, '.')
    const qtyErp = parseFloat(cleanQty)

    const item = dbStok.value.find(i => (i.kodeErp || '').toUpperCase() === rawKey.toUpperCase())
    let stokAppTarget = 0

    if (item) {
      const logsObj = allHistories.value[item.idUnik] || {}
      const logs = Object.values(logsObj)

      // Cari semua log yang terjadi sebelum atau tepat pada tanggal yang dipilih
      const pastLogs = logs.filter(l => new Date(l.tanggal).getTime() <= targetTime)
      
      if (pastLogs.length > 0) {
        // Urutkan dari yang terlama ke terbaru, lalu ambil stokAkhir dari log paling ujung (terbaru di masa lalu itu)
        pastLogs.sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal))
        stokAppTarget = parseFloat(pastLogs[pastLogs.length - 1].stokAkhir) || 0
      } else {
        // Kalau belum ada transaksi sama sekali sebelum tanggal itu, pakai stok awal
        stokAppTarget = parseFloat(item.stokAwal) || 0
      }
    }

    tempRows.push({
      kodeErp: rawKey,
      itemId: item ? item.idUnik : '',
      nama: item ? item.nama : '',
      warna: item ? item.warna : '',
      stokApp: stokAppTarget,
      stokErp: isNaN(qtyErp) ? 0 : qtyErp
    })
  })

  rows.value = tempRows
}

// Pantau perubahan pada text paste dan juga perubahan pada tanggal!
watch([rawPasteText, tanggalOpname], () => {
  processData()
})

const exportExcel = () => {
  if (!rows.value.length) return
  
  const tglReport = new Date(tanggalOpname.value)
  
  const dataToExport = [
    ['LAPORAN CEK SELISIH: APLIKASI VS ERP'],
    [`Tanggal Cut-Off / Sinkronisasi: ${tglReport.toLocaleDateString('id-ID')} ${tglReport.toLocaleTimeString('id-ID')}`],
    [],
    ['KODE ERP', 'NAMA BARANG', 'WARNA', 'STOK APLIKASI (KG)', 'STOK ERP (KG)', 'SELISIH (KG)', 'STATUS']
  ]

  rows.value.forEach(r => {
    const selisih = getSelisih(r)
    let status = 'SINKRON'
    if (!r.itemId) status = 'TIDAK ADA DI APLIKASI'
    else if (selisih !== 0) status = 'TIDAK SINKRON'

    dataToExport.push([
      r.kodeErp,
      r.nama || '-',
      r.warna || '-',
      r.itemId ? r.stokApp : 0,
      r.stokErp,
      r.itemId ? selisih : 0,
      status
    ])
  })

  const ws = window.XLSX.utils.aoa_to_sheet(dataToExport)
  const wb = window.XLSX.utils.book_new()
  window.XLSX.utils.book_append_sheet(wb, ws, 'Selisih_ERP')
  window.XLSX.writeFile(wb, `Laporan_Selisih_ERP_${tanggalOpname.value.split('T')[0]}.xlsx`)
}

const sesuaikanKeErp = async () => {
  const validToSync = rows.value.filter(r => r.itemId && getSelisih(r) !== 0)
  if (!validToSync.length) {
    window.Swal.fire('Info', 'Semua data yang valid sudah sinkron dengan ERP.', 'info')
    return
  }

  const confirm = await window.Swal.fire({
    title: `Sinkronkan ${validToSync.length} Item?`,
    html: `Stok aplikasi akan ditimpa (di-opname otomatis) mengikuti angka ERP pada tanggal yang dipilih.<br><br><b class='text-danger'>Sistem akan menjalankan audit ulang setelah proses ini selesai.</b>`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#3b82f6',
    confirmButtonText: 'Ya, Sinkronkan!'
  })
  if (!confirm.isConfirmed) return

  submitting.value = true
  try {
    const updates = {}
    
    let baseTimeObj = new Date(tanggalOpname.value)
    if (isNaN(baseTimeObj.getTime())) baseTimeObj = new Date()
    const baseTime = baseTimeObj.getTime()

    validToSync.forEach((row, i) => {
      const item = dbStok.value.find(x => x.idUnik === row.itemId)
      if (!item) return

      const qtyErpTarget = parseFloat(row.stokErp)
      
      const rowIsoDate = new Date(baseTime + (i * 1000)).toISOString()
      const trxId = 'BCH_ERP_' + (baseTime + (i * 1000))

      updates[`stok_benang/${row.itemId}/stok`] = qtyErpTarget
      updates[`stok_benang/${row.itemId}/tglUpdate`] = rowIsoDate

      updates[`riwayat_transaksi/${row.itemId}/${trxId}`] = {
        trxId,
        kodeErp: item.kodeErp,
        qty: qtyErpTarget,
        stokAkhir: qtyErpTarget,
        tanggal: rowIsoDate,
        tipe: 'OPNAME',
        blok: '', 
        keterangan: 'SINKRONISASI SISTEM ERP'
      }
    })

    await update(dbRef(db), updates)
    
    // 🔥 PENTING: Jalankan Audit untuk mengkalkulasi ulang stok dari tanggal opname sampai hari ini!
    await jalankanAudit()

    window.Swal.fire({ icon: 'success', title: 'Aplikasi Sudah Sinkron dengan ERP!', timer: 1500, showConfirmButton: false })
    refreshData()
    emit('close')
  } catch (e) {
    window.Swal.fire('Error', e.message, 'error')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.modern-modal { border-radius: 24px; background: var(--bg-card); overflow: hidden; }
.backdrop-blur { background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); }
.icon-circle { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }

.bg-primary-subtle { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
.text-primary { color: #3b82f6 !important; }
.border-primary-subtle { border: 1px solid rgba(59, 130, 246, 0.3); }

.section-label { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; }
.step-num { display: inline-block; width: 20px; height: 20px; line-height: 20px; text-align: center; color: white; border-radius: 50%; font-size: 0.7rem; margin-right: 4px; }
.bg-primary { background-color: #3b82f6 !important; }

.custom-textarea { background: var(--bg-card); color: var(--text-main); border: 2px dashed var(--border-color); border-radius: 12px; padding: 16px; font-size: 0.85rem; }
.custom-textarea:focus { border-color: #3b82f6; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); outline: none; }
.border-top-custom { border-top: 1px dashed var(--border-color); }

.table-container { border-radius: 12px; border: 1px solid var(--border-color); max-height: 40vh; overflow-y: auto; }
.modern-table th { background: var(--bg-main); color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; padding: 12px 8px; border-bottom: 2px solid var(--border-color); }
.modern-table td { background: var(--bg-card); border-bottom: 1px solid var(--border-color); padding: 8px; }

.row-warning td { background: rgba(245, 158, 11, 0.05); }
.row-danger td { background: rgba(239, 68, 68, 0.05); }

.btn-primary { background: linear-gradient(135deg, #3b82f6, #2563eb); border: none; padding: 14px; border-radius: 12px; }
.btn-primary:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.05); }
.btn-light-action { background: var(--bg-main); color: var(--text-muted); border: 1px solid var(--border-color); border-radius: 12px; }
.btn-light-action:hover { background: var(--border-color); color: var(--text-main); }
</style>
