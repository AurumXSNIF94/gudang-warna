<template>
  <div class="modal fade show d-block backdrop-blur" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered modal-xl">
      <div class="modal-content modern-modal border-0 shadow-lg">

        <div class="modal-header border-0 pb-3">
          <div class="w-100">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h5 class="modal-title fw-bold d-flex align-items-center gap-2 m-0" style="letter-spacing: -0.5px; color: var(--text-main);">
                <div class="icon-circle bg-info-subtle text-info">
                  <i class="fas fa-calendar-day"></i>
                </div>
                Rekapitulasi Harian
              </h5>
              <button type="button" class="btn-close btn-close-custom" @click="$emit('close')"></button>
            </div>
            
            <div class="d-flex gap-2 flex-wrap align-items-center">
              <input type="date" class="form-control custom-input fw-bold" style="width: auto;" v-model="tglPicker" @change="loadData">
              <button class="btn btn-sm btn-light-action fw-bold px-3" @click="loadData">
                <i class="fas fa-sync-alt me-1"></i> Refresh
              </button>
              <button class="btn btn-sm btn-success fw-bold px-3" @click="exportExcel">
                <i class="fas fa-file-excel me-1"></i> Export
              </button>
              <button v-if="currentRole === 'admin' && checkedIds.length"
                      class="btn btn-sm btn-danger fw-bold px-3"
                      @click="hapusTerpilih">
                <i class="fas fa-trash-alt me-1"></i> Hapus ({{ checkedIds.length }})
              </button>
            </div>
          </div>
        </div>

        <div class="modal-body p-0">
          <div class="table-responsive" style="max-height:50vh; overflow-y:auto;">
            <table class="table modern-table table-hover align-middle mb-0">
              <thead class="sticky-top">
                <tr>
                  <th v-if="currentRole === 'admin'" class="text-center" style="width:40px">
                    <input type="checkbox" class="form-check-input" :checked="allChecked" @change="toggleAll">
                  </th>
                  <th>Barang</th>
                  <th>Transaksi</th>
                  <th class="text-end">Qty (Kg)</th>
                  <th>Keterangan</th>
                  <th v-if="currentRole === 'admin'" class="text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <template v-if="loading">
                  <tr><td :colspan="currentRole === 'admin' ? 6 : 5" class="text-center py-5"><div class="spinner-border text-primary"></div></td></tr>
                </template>
                <template v-else-if="groupedLogs.length">
                  <template v-for="group in groupedLogs" :key="group.tipe + group.ket">
                    <tr :class="tipeRowClass(group.tipe)">
                      <td :colspan="currentRole === 'admin' ? 6 : 5" class="fw-bold py-2 px-3">
                        <i :class="tipeIcon(group.tipe)" class="me-2"></i> {{ group.tipe }}
                      </td>
                    </tr>
                    <tr class="group-header">
                      <td v-if="currentRole === 'admin'" class="text-center">
                        <input type="checkbox" class="form-check-input" :checked="isGroupChecked(group)" @change="toggleGroup(group, $event)">
                      </td>
                      <td :colspan="currentRole === 'admin' ? 5 : 5" class="fw-bold text-muted ps-3 small">
                        <i class="fas fa-tag me-1"></i> {{ group.ket }} ({{ group.rows.length }} items)
                      </td>
                    </tr>
                    <tr v-for="r in group.rows" :key="r.trxId" :class="checkedIds.includes(r.parentId+'|'+r.trxId) ? 'table-active' : ''">
                      <td v-if="currentRole === 'admin'" class="text-center"><input type="checkbox" class="form-check-input" :value="r.parentId+'|'+r.trxId" v-model="checkedIds"></td>
                      <td class="ps-3">
                        <div class="fw-bold" style="color:var(--text-main)">{{ r.namaBarang }}</div>
                        <div class="small font-monospace" style="color:var(--text-muted)">{{ r.kodeErpRef }}</div>
                      </td>
                      <td>
                        <span class="badge-soft" :class="tipeBadgeClass(r.tipe)">{{ r.tipe }}</span>
                        <div v-if="r.blok" class="small mt-1" style="color:var(--text-muted)"><i class="fas fa-warehouse me-1"></i> {{ r.blok }}</div>
                      </td>
                      <td class="text-end fw-bold">{{ fmt(r.qty) }}</td>
                      <td><span class="badge-soft badge-soft-secondary text-uppercase">{{ r.keterangan || '-' }}</span></td>
                      <td v-if="currentRole === 'admin'" class="text-center">
                        <button class="btn btn-sm btn-link text-warning p-0" @click="editDariHarian(r)"><i class="fas fa-pencil-alt"></i></button>
                      </td>
                    </tr>
                  </template>
                </template>
                <template v-else>
                  <tr><td :colspan="currentRole === 'admin' ? 6 : 5" class="text-center py-5 text-muted">Data kosong pada tanggal ini.</td></tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>

        <div class="modal-footer bg-main py-4 border-0">
          <div class="d-flex flex-wrap gap-3 justify-content-center w-100">
            <div v-for="(d, ket) in rekapMap" :key="ket" class="rekap-box">
              <div class="rekap-label">{{ ket }}</div>
              <div class="d-flex gap-3">
                <div class="text-success"><small class="fw-bold d-block">IN</small><b>{{ fmt(d.MASUK) }}</b></div>
                <div class="text-danger"><small class="fw-bold d-block">OUT</small><b>{{ fmt(d.KELUAR) }}</b></div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ref as dbRef, get, update } from 'firebase/database'
import { db } from '../../firebase'
import { dbStok, useStok } from '../../composables/useStok'
import { useEditTrans } from '../../composables/useEditTrans'
import { currentRole } from '../../composables/useAuth'

const emit = defineEmits(['close'])
const { refreshData } = useStok()
const { bukaEdit } = useEditTrans()

const tglPicker = ref(new Date().toISOString().slice(0, 10))
const loading = ref(false)
const logs = ref([])
const checkedIds = ref([]) 

const fmt = n => Number(n || 0).toLocaleString('id-ID', {
  minimumFractionDigits: 2, maximumFractionDigits: 2
})

const editDariHarian = (r) => {
  bukaEdit(r, r.parentId)
  emit('close')
}

const allChecked = computed(() => {
  const allIds = logs.value.map(r => r.parentId + '|' + r.trxId)
  return allIds.length > 0 && allIds.every(id => checkedIds.value.includes(id))
})

const toggleAll = (e) => {
  checkedIds.value = e.target.checked ? logs.value.map(r => r.parentId + '|' + r.trxId) : []
}

const isGroupChecked = (group) => group.rows.every(r => checkedIds.value.includes(r.parentId + '|' + r.trxId))

const toggleGroup = (group, e) => {
  const ids = group.rows.map(r => r.parentId + '|' + r.trxId)
  if (e.target.checked) {
    const newIds = ids.filter(id => !checkedIds.value.includes(id))
    checkedIds.value.push(...newIds)
  } else {
    checkedIds.value = checkedIds.value.filter(id => !ids.includes(id))
  }
}

const loadData = async () => {
  loading.value = true
  logs.value = []
  checkedIds.value = [] 
  try {
    const snap = await get(dbRef(db, 'riwayat_transaksi'))
    const all = snap.val() || {}
    const result = []
    Object.keys(all).forEach(pId => {
      Object.values(all[pId] || {}).forEach(trx => {
        
        // 🔥 LOGIKA WHITELIST: HANYA MELOLOSKAN MASUK & KELUAR 🔥
        if (trx.tipe !== 'MASUK' && trx.tipe !== 'KELUAR') {
          return 
        }

        if (trx.tanggal?.startsWith(tglPicker.value)) {
          const m = dbStok.value.find(x => x.idUnik === pId)
          result.push({ ...trx, namaBarang: m?.nama || 'N/A', kodeErpRef: m?.kodeErp || '-', parentId: pId })
        }
      })
    })
    result.sort((a, b) => (a.kodeErpRef || '').localeCompare(b.kodeErpRef || ''))
    logs.value = result
  } finally { loading.value = false }
}

const hapusTerpilih = async () => {
  const result = await window.Swal.fire({
    title: `Hapus ${checkedIds.value.length} Data?`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc2626'
  })
  if (!result.isConfirmed) return

  try {
    const parentIds = new Set()
    const delUpdates = {}
    checkedIds.value.forEach(val => {
      const [pId, tId] = val.split('|')
      delUpdates[`riwayat_transaksi/${pId}/${tId}`] = null
      parentIds.add(pId)
    })
    await update(dbRef(db), delUpdates)
    const [snapM, snapH] = await Promise.all([get(dbRef(db, 'stok_benang')), get(dbRef(db, 'riwayat_transaksi'))])
    const masters = snapM.val() || {}, histories = snapH.val() || {}, auditUp = {}
    parentIds.forEach(id => {
      const item = masters[id]
      if (!item) return
      let run = Number(item.stokAwal) || 0
      const bloksAudit = {}
      Object.values(histories[id] || {}).sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal)).forEach(l => {
        const q = Number(l.qty)
        if (l.tipe === 'MASUK') { run += q; if (l.blok) bloksAudit[l.blok] = (parseFloat(bloksAudit[l.blok]) || 0) + q }
        else if (l.tipe === 'KELUAR') { run -= q; if (l.blok) bloksAudit[l.blok] = (parseFloat(bloksAudit[l.blok]) || 0) - q }
        else if (l.tipe === 'OPNAME') { if (l.blok) { run += (q - (parseFloat(bloksAudit[l.blok])||0)); bloksAudit[l.blok] = q } else run = q }
        auditUp[`riwayat_transaksi/${id}/${l.trxId}/stokAkhir`] = parseFloat(run.toFixed(2))
      })
      auditUp[`stok_benang/${id}/stok`] = run
      auditUp[`stok_benang/${id}/bloks`] = Object.keys(bloksAudit).length ? bloksAudit : null
    })
    await update(dbRef(db), auditUp)
    refreshData(); loadData()
  } catch(e) { window.Swal.fire('Error', e.message, 'error') }
}

const groupedLogs = computed(() => {
  const groups = {}
  logs.value.forEach(r => {
    const key = `${r.tipe}||${(r.keterangan || 'LAIN-LAIN').toUpperCase()}`
    if (!groups[key]) groups[key] = { tipe: r.tipe, ket: (r.keterangan || 'LAIN-LAIN').toUpperCase(), rows: [] }
    groups[key].rows.push(r)
  })
  // 🔥 UPDATE SORTING UNTUK MASUK & KELUAR SAJA
  return Object.values(groups).sort((a, b) => ['MASUK','KELUAR'].indexOf(a.tipe) - ['MASUK','KELUAR'].indexOf(b.tipe))
})

const rekapMap = computed(() => {
  const map = {}
  logs.value.forEach(r => {
    const ket = (r.keterangan || 'LAIN-LAIN').toUpperCase()
    if (!map[ket]) map[ket] = { MASUK: 0, KELUAR: 0 }
    if (r.tipe === 'MASUK') map[ket].MASUK += parseFloat(r.qty) || 0
    if (r.tipe === 'KELUAR') map[ket].KELUAR += parseFloat(r.qty) || 0
  })
  return map
})

const tipeRowClass = t => ({ 'bg-success': t === 'MASUK', 'bg-danger': t === 'KELUAR', 'bg-warning': t === 'OPNAME' })
const tipeBadgeClass = t => ({ 'badge-soft-primary': t === 'MASUK', 'badge-soft-danger': t === 'KELUAR', 'badge-soft-warning': t === 'OPNAME' })
const tipeIcon = t => ({ 'MASUK': 'fas fa-arrow-down', 'KELUAR': 'fas fa-arrow-up', 'OPNAME': 'fas fa-check-double' }[t])

const exportExcel = () => {
  if (!logs.value.length) return
  const rows = [['REKAPITULASI TRANSAKSI HARIAN', `Tanggal: ${tglPicker.value}`], [], ['TANGGAL', 'JAM', 'KODE ERP', 'NAMA BARANG', 'TIPE', 'BLOK', 'QTY (KG)', 'KETERANGAN'], ...logs.value.map(l => [new Date(l.tanggal).toLocaleDateString('id-ID'), new Date(l.tanggal).toLocaleTimeString('id-ID'), l.kodeErpRef, l.namaBarang, l.tipe, (l.blok || '-').toUpperCase(), l.qty, l.keterangan])]
  const ws = window.XLSX.utils.aoa_to_sheet(rows), wb = window.XLSX.utils.book_new()
  window.XLSX.utils.book_append_sheet(wb, ws, 'Rekap_Harian'); window.XLSX.writeFile(wb, `Rekap_${tglPicker.value}.xlsx`)
}

onMounted(() => loadData())
</script>

<style scoped>
.modern-modal { border-radius: 24px; background: var(--bg-card); }
.backdrop-blur { background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); }
.icon-circle { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.bg-info-subtle { background: rgba(6, 182, 212, 0.1); color: #06b6d4; }
.modern-table th { background: var(--bg-main); color: var(--text-muted); font-size: 0.7rem; text-transform: uppercase; padding: 12px; }
.modern-table td { color: var(--text-main); }
.group-header { background: var(--bg-main); }
.badge-soft { font-size: 0.7rem; padding: 3px 8px; border-radius: 6px; font-weight: 700; }
.badge-soft-primary { background: rgba(79, 70, 229, 0.1); color: #818cf8; }
.badge-soft-danger { background: rgba(239, 68, 68, 0.1); color: #f87171; }
.badge-soft-warning { background: rgba(245, 158, 11, 0.1); color: #fbbf24; }
.badge-soft-secondary { background: var(--bg-main); color: var(--text-muted); }
.rekap-box { background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 12px; padding: 12px; }
.rekap-label { font-size: 0.7rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 5px; }
.btn-close-custom { background: transparent url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%2364748b'%3e%3cpath d='M.293.293a1 1 0 0 1 1.414 0L8 6.586 14.293.293a1 1 0 1 1 1.414 1.414L9.414 8l6.293 6.293a1 1 0 0 1-1.414-1.414L6.586 8 .293 1.707a1 1 0 0 1 0-1.414z'/%3e%3c/svg%3e") center/1em auto no-repeat; opacity: 0.5; }
</style>
