<template>
  <div class="col-12 col-md-6 col-lg-4">
    <div class="card-item p-4" :class="isCritical ? 'card-critical' : 'card-normal'">

      <div class="d-flex justify-content-between mb-3 align-items-start">
        <h5 class="fw-bold m-0 text-truncate item-title" style="letter-spacing:-0.5px">
          {{ item.nama }}
        </h5>
        <div class="d-flex align-items-center gap-1 flex-wrap justify-content-end">
          <span :class="['badge-soft', jenisBadgeColor]">{{ item.jenis }}</span>
          <span class="badge-soft badge-soft-warning fw-bold">{{ item.grade || '-' }}</span>
          
          <template v-if="velocity">
            <span v-if="velocity === 'FAST'" class="badge-soft badge-soft-danger ms-1 fw-bold fast-pulse">
              <i class="fas fa-fire me-1"></i>FAST MOVING
            </span>
            <span v-else-if="velocity === 'MEDIUM'" class="badge-soft badge-soft-success ms-1 fw-bold">
              <i class="fas fa-arrow-trend-up me-1"></i>MEDIUM
            </span>
            <span v-else-if="velocity === 'SLOW'" class="badge-soft badge-soft-warning ms-1 fw-bold">
              <i class="fas fa-hourglass-half me-1"></i>SLOW MOVING
            </span>
            <span v-else class="badge-soft badge-soft-secondary ms-1 fw-bold opacity-75">
              <i class="fas fa-snowflake me-1"></i>DEAD STOCK
            </span>
          </template>
        </div>
      </div>

      <div class="mb-4">
        <div class="d-flex align-items-center mb-3">
          <span class="item-meta">{{ item.warna }}</span>
          <span class="mx-2 text-muted" style="font-size: 0.8rem;">•</span>
          <span class="item-meta fw-bold font-monospace">{{ item.kodeErp }}</span>
        </div>
        
        <div class="blok-grid">
          <template v-if="daftarBlok.length || sisaTanpaBlok !== 0">
            
            <div v-for="b in daftarBlok" :key="b.nama" :class="b.qty < 0 ? 'pill-split-danger' : 'pill-split-normal'">
              <div class="pill-left">
                <i class="fas fa-warehouse opacity-50 me-2"></i>
                <span class="text-truncate">{{ b.nama }}</span>
              </div>
              <div class="pill-right font-monospace">
                {{ fmt(b.qty) }}
              </div>
            </div>
            
            <div v-if="sisaTanpaBlok !== 0" :class="sisaTanpaBlok < 0 ? 'pill-split-danger span-full' : 'pill-split-warning span-full'">
              <div class="pill-left">
                <i class="fas fa-map-marker-alt opacity-50 me-2"></i>
                <span>Tanpa Lokasi</span>
              </div>
              <div class="pill-right font-monospace">
                {{ fmt(sisaTanpaBlok) }}
              </div>
            </div>

          </template>
          
          <template v-else>
            <div class="pill-empty-state span-full">
              <i class="fas fa-box-open me-2 opacity-50"></i>
              Belum ada stok fisik
            </div>
          </template>
        </div>
      </div>

      <div class="stok-box mb-4" :class="isCritical ? 'stok-box-kritis' : 'stok-box-aman'">
        <div class="stok-lbl">TOTAL STOK TERSEDIA</div>
        <div class="stok-val">
          {{ fmt(item.stok) }} <span class="stok-unit">Kg</span>
        </div>
      </div>

      <div v-if="role === 'admin'" class="d-flex gap-2">
        <button class="btn btn-action btn-in flex-grow-1" @click="$emit('transaksi', 'MASUK', item)">
          <i class="fas fa-arrow-down me-1"></i> Masuk
        </button>
        <button class="btn btn-action btn-out flex-grow-1" @click="$emit('transaksi', 'KELUAR', item)">
          <i class="fas fa-arrow-up me-1"></i> Keluar
        </button>
        <button class="btn btn-action btn-light-action border" title="Riwayat" @click="$emit('riwayat', item.idUnik)">
          <i class="fas fa-history text-secondary"></i>
        </button>
        <button class="btn btn-action btn-audit-action" title="Opname" @click="$emit('transaksi', 'OPNAME', item)">
          <i class="fas fa-check-double"></i>
        </button>
      </div>
      <div v-else class="d-grid">
        <button class="btn btn-action btn-light-action border w-100 d-flex justify-content-center align-items-center" @click="$emit('riwayat', item.idUnik)">
          <i class="fas fa-history me-2 text-primary"></i> Lihat Riwayat
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  item: Object,
  velocity: String,
  role: String
})

defineEmits(['transaksi', 'riwayat'])

const fmt = n => Number(n || 0).toLocaleString('id-ID', {
  minimumFractionDigits: 2, maximumFractionDigits: 2
})

const isCritical = computed(() => {
  const s = Number(props.item.stok) || 0
  return s < 5 && s !== 0
})

const jenisBadgeColor = computed(() => {
  const t = (props.item.jenis || '').toUpperCase()
  if (t.includes('AJL'))     return 'badge-soft-primary'
  if (t.includes('WARPING')) return 'badge-soft-danger'
  if (t.includes('WEAVING')) return 'badge-soft-warning'
  if (t.includes('KELOS'))   return 'badge-soft-success'
  return 'badge-soft-secondary'
})

const daftarBlok = computed(() => {
  const bloks = props.item?.bloks
  if (!bloks) return []
  return Object.entries(bloks)
    .filter(([nama, qty]) => {
      if (!nama) return false
      const n = String(nama).trim().toUpperCase()
      return parseFloat(qty) !== 0 && n !== '' && n !== 'NULL' && n !== 'UNDEFINED' && !n.includes('TANPA LOKASI')
    })
    .map(([nama, qty]) => ({ nama, qty: parseFloat(qty) }))
})

const sisaTanpaBlok = computed(() => {
  const bloks = props.item?.bloks || {}
  const totalStok = parseFloat(props.item?.stok) || 0
  
  let stokDiRakFisik = 0
  Object.entries(bloks).forEach(([nama, qty]) => {
    if (!nama) return
    const n = String(nama).trim().toUpperCase()
    if (n !== '' && n !== 'NULL' && n !== 'UNDEFINED' && !n.includes('TANPA LOKASI')) {
      stokDiRakFisik += (parseFloat(qty) || 0)
    }
  })

  let selisih = totalStok - stokDiRakFisik
  return Math.abs(selisih) > 0.001 ? selisih : 0
})
</script>

<style scoped>
/* CARD BASE */
.card-item {
  border-radius: 20px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  transition: all 0.2s ease-in-out;
}
.card-normal {
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);
}
.card-critical {
  box-shadow: 0 4px 15px rgba(220, 53, 69, 0.1);
  border-color: #fecaca;
}
.card-item:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
}

.item-title { color: var(--text-main); font-size: 1.15rem; }
.item-meta { color: var(--text-muted); font-size: 0.85rem; font-weight: 500; }

.badge-soft {
  font-size: 0.72rem; padding: 4px 10px; border-radius: 8px; font-weight: 700; display: inline-block;
}
.badge-soft-primary { background: rgba(79, 70, 229, 0.1); color: #4f46e5; }
.badge-soft-success { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.badge-soft-danger { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
.badge-soft-warning { background: rgba(245, 158, 11, 0.15); color: #d97706; }
:global([data-bs-theme="dark"]) .badge-soft-warning { color: #f59e0b; }
.badge-soft-secondary { background: var(--bg-main); color: var(--text-muted); }

/* 🔥 SYSTEM GRID BERSIH (2 KOLOM) 🔥 */
.blok-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.span-full {
  grid-column: span 2;
}

/* 🔥 STYLE BARU: CONSTRUCT SPLIT PILL (DUAL TONE) 🔥 */
.pill-split-normal, .pill-split-warning, .pill-split-danger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-main);
  border-radius: 10px;
  padding: 3px 3px 3px 10px; /* ruang kiri longgar, kanan mepet ke sub-badge */
  font-size: 0.78rem;
  font-weight: 600;
  border: 1px solid var(--border-color);
}

.pill-left {
  display: flex;
  align-items: center;
  color: var(--text-main);
  min-width: 0;
}

.pill-right {
  padding: 4px 8px;
  border-radius: 7px;
  font-weight: 700;
  font-size: 0.75rem;
  white-space: nowrap;
}

/* Pewarnaan Sub-Badge Kanan Berdasarkan Status */
.pill-split-normal { border-color: rgba(14, 165, 233, 0.15); }
.pill-split-normal .pill-right { background: rgba(14, 165, 233, 0.12); color: #0ea5e9; }

.pill-split-warning { border-color: rgba(245, 158, 11, 0.2); }
.pill-split-warning .pill-right { background: rgba(245, 158, 11, 0.15); color: #d97706; }
:global([data-bs-theme="dark"]) .pill-split-warning .pill-right { color: #f59e0b; }

.pill-split-danger { border-color: rgba(239, 68, 68, 0.2); background: rgba(239, 68, 68, 0.02); }
.pill-split-danger .pill-right { background: rgba(239, 68, 68, 0.12); color: #ef4444; }

/* Empty State Style */
.pill-empty-state {
  font-size: 0.75rem; padding: 8px 12px; border-radius: 8px; font-weight: 500;
  background: var(--bg-main); color: var(--text-muted); border: 1px dashed var(--border-color);
  text-align: center;
}

/* STOK BOX TOTAL */
.stok-box {
  padding: 12px 16px; border-radius: 12px;
  display: flex; flex-direction: column; gap: 4px;
}
.stok-box-aman { background: var(--bg-main); border-left: 4px solid #10b981; }
.stok-box-kritis { background: rgba(239, 68, 68, 0.05); border-left: 4px solid #ef4444; }

.stok-lbl { font-size: 0.7rem; color: var(--text-muted); font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; }
.stok-val { font-size: 1.8rem; font-weight: 800; color: var(--text-main); line-height: 1; letter-spacing: -1px; }
.stok-box-kritis .stok-val { color: #dc2626; }
.stok-unit { font-size: 0.9rem; color: var(--text-muted); font-weight: 600; letter-spacing: normal; }

/* BTN ACTIONS */
.btn-action {
  font-weight: 600; font-size: 0.85rem; padding: 8px 12px; border-radius: 10px;
  transition: all 0.2s; display: flex; align-items: center; justify-content: center;
}
.btn-in { background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); }
.btn-in:hover { background: rgba(16, 185, 129, 0.2); }
.btn-out { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
.btn-out:hover { background: rgba(239, 68, 68, 0.2); }
.btn-light-action { background: var(--bg-card); color: var(--text-muted); border-color: var(--border-color); }
.btn-light-action:hover { background: var(--bg-main); border-color: var(--text-muted); }
.btn-audit-action { background: rgba(245, 158, 11, 0.1); color: #d97706; border: 1px solid rgba(245, 158, 11, 0.2); }
.btn-audit-action:hover { background: rgba(245, 158, 11, 0.2); }

.fast-pulse { animation: pulse-danger 2s infinite; }
@keyframes pulse-danger {
  0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); }
  70% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
  100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}
</style>
