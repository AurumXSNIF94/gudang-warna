import { ref } from 'vue'
import { ref as dbRef, onValue, update, get } from 'firebase/database'
import { db } from '../firebase'

export const dbStok = ref([])
export const itemVelocity = ref({})
export const loading = ref(true)

export function useStok() {
  
  // 1. Fungsi Refresh Data Utama
  const refreshData = () => {
    loading.value = true
    onValue(dbRef(db, 'stok_benang'), (snap) => {
      const data = snap.val() || {}
      dbStok.value = Object.keys(data).map(k => ({ idUnik: k, ...data[k] }))
      kalkulasiVelocity()
      loading.value = false
    })
  }

  // (Opsional) Fungsi menghitung Velocity FAST/MEDIUM/SLOW
  const kalkulasiVelocity = () => {
    const vel = {}
    dbStok.value.forEach(item => {
      // Anda bisa menyesuaikan rumus ini dengan rumus asli gudang Anda
      const s = parseFloat(item.stok) || 0
      if (s <= 0) vel[item.idUnik] = 'DEAD'
      else if (s < 50) vel[item.idUnik] = 'SLOW'
      else if (s < 200) vel[item.idUnik] = 'MEDIUM'
      else vel[item.idUnik] = 'FAST'
    })
    itemVelocity.value = vel
  }

  // 2. Fungsi Transaksi Utama (Masuk, Keluar, Opname, RETUR)
  const kirimTransaksi = async (idUnik, tipe, qty, ket, blokNama) => {
    const item = dbStok.value.find(x => x.idUnik === idUnik)
    if (!item) throw new Error('Data Barang tidak ditemukan di sistem.')
    
    const q = parseFloat(qty)
    if (isNaN(q) || q < 0) throw new Error('Kuantitas (Qty) tidak valid.')

    let sLama = parseFloat(item.stok) || 0
    let bloks = { ...(item.bloks || {}) }
    let stokBlokLama = parseFloat(bloks[blokNama] || 0)
    let sBaru = sLama

    // LOGIKA UPDATE: Tangkap MASUK dan RETUR sebagai Penambahan
    if (tipe === 'MASUK' || tipe === 'RETUR') {
      sBaru = sLama + q
      if (blokNama) bloks[blokNama] = stokBlokLama + q
    } 
    else if (tipe === 'KELUAR') {
      if (sLama < q) throw new Error('Total stok tidak mencukupi untuk dikeluarkan.')
      if (blokNama && stokBlokLama < q) throw new Error(`Stok fisik di Blok ${blokNama} tidak mencukupi.`)
      sBaru = sLama - q
      if (blokNama) bloks[blokNama] = stokBlokLama - q
    } 
    else if (tipe === 'OPNAME') {
      if (blokNama) {
        const selisih = q - stokBlokLama
        sBaru = sLama + selisih
        bloks[blokNama] = q
      } else {
        sBaru = q
      }
    }

    // Pembersihan desimal dan blok kosong
    sBaru = parseFloat(sBaru.toFixed(2))
    if (blokNama) {
      bloks[blokNama] = parseFloat(bloks[blokNama].toFixed(2))
      if (bloks[blokNama] <= 0) delete bloks[blokNama]
    }

    const iso = new Date().toISOString()
    const trxId = 'TRX_' + Date.now()
    const updates = {}

    // Update Database
    updates[`stok_benang/${idUnik}/stok`] = sBaru
    updates[`stok_benang/${idUnik}/bloks`] = Object.keys(bloks).length ? bloks : null
    updates[`stok_benang/${idUnik}/tglUpdate`] = iso
    
    updates[`riwayat_transaksi/${idUnik}/${trxId}`] = {
      trxId,
      kodeErp: item.kodeErp,
      tipe,
      qty: q,
      blok: blokNama || '',
      stokAkhir: sBaru,
      keterangan: (ket || '').toUpperCase(),
      tanggal: iso
    }

    await update(dbRef(db), updates)
  }

  // 3. Fungsi Khusus Pindah Antar Blok
  const kirimMutasi = async (idUnik, qty, blokAsal, blokTujuan) => {
    const item = dbStok.value.find(x => x.idUnik === idUnik)
    if (!item) throw new Error('Item tidak ditemukan.')
    
    const q = parseFloat(qty)
    if (isNaN(q) || q <= 0) throw new Error('Qty mutasi tidak valid.')

    let bloks = { ...(item.bloks || {}) }
    
    // Kurangi dari blok asal
    if (blokAsal !== 'Tanpa Lokasi') {
      let stokAsal = parseFloat(bloks[blokAsal] || 0)
      if (stokAsal < q) throw new Error(`Stok asal di Blok ${blokAsal} kurang dari ${q} Kg.`)
      bloks[blokAsal] = parseFloat((stokAsal - q).toFixed(2))
      if (bloks[blokAsal] <= 0) delete bloks[blokAsal]
    }

    // Tambahkan ke blok tujuan
    if (blokTujuan !== 'Tanpa Lokasi') {
      let stokTujuan = parseFloat(bloks[blokTujuan] || 0)
      bloks[blokTujuan] = parseFloat((stokTujuan + q).toFixed(2))
    }

    const iso = new Date().toISOString()
    const trxId = 'MUT_' + Date.now()
    const updates = {}

    updates[`stok_benang/${idUnik}/bloks`] = Object.keys(bloks).length ? bloks : null
    updates[`stok_benang/${idUnik}/tglUpdate`] = iso
    
    updates[`riwayat_transaksi/${idUnik}/${trxId}`] = {
      trxId,
      kodeErp: item.kodeErp,
      tipe: 'MUTASI',
      qty: q,
      blok: `${blokAsal} -> ${blokTujuan}`,
      stokAkhir: parseFloat(item.stok) || 0,
      keterangan: `PINDAH LOKASI FISIK`,
      tanggal: iso
    }

    await update(dbRef(db), updates)
  }

  // 4. Engine Audit Global (Hitung Ulang Paksa)
  const jalankanAudit = async () => {
    const snapStok = await get(dbRef(db, 'stok_benang'))
    const snapHist = await get(dbRef(db, 'riwayat_transaksi'))
    
    if (!snapStok.exists() || !snapHist.exists()) return

    const stokData = snapStok.val()
    const histData = snapHist.val()
    const updates = {}

    for (const idUnik in stokData) {
      const itemHist = histData[idUnik]
      if (!itemHist) continue

      let totalStok = 0
      let bloksTemp = {}

      // Urutkan riwayat dari yang terlama ke terbaru
      const logs = Object.values(itemHist).sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal))

      logs.forEach(l => {
        const q = parseFloat(l.qty) || 0
        const lokasi = l.blok || ''

        // LOGIKA UPDATE: Tangkap MASUK dan RETUR sebagai Penambahan saat Audit
        if (l.tipe === 'MASUK' || l.tipe === 'RETUR') {
          totalStok += q
          if (lokasi && lokasi !== 'Tanpa Lokasi') {
            bloksTemp[lokasi] = (bloksTemp[lokasi] || 0) + q
          }
        } 
        else if (l.tipe === 'KELUAR') {
          totalStok -= q
          if (lokasi && lokasi !== 'Tanpa Lokasi') {
            bloksTemp[lokasi] = (bloksTemp[lokasi] || 0) - q
          }
        } 
        else if (l.tipe === 'OPNAME') {
          if (lokasi && lokasi !== 'Tanpa Lokasi') {
            const lama = bloksTemp[lokasi] || 0
            totalStok += (q - lama)
            bloksTemp[lokasi] = q
          } else {
            totalStok = q
          }
        } 
        else if (l.tipe === 'MUTASI') {
           if (lokasi.includes('->')) {
              const [asal, tujuan] = lokasi.split('->').map(s => s.trim())
              if (asal !== 'Tanpa Lokasi') bloksTemp[asal] = (bloksTemp[asal] || 0) - q
              if (tujuan !== 'Tanpa Lokasi') bloksTemp[tujuan] = (bloksTemp[tujuan] || 0) + q
           }
        }
      })

      // Finalisasi dan bersihkan data minus/nol setelah dihitung ulang
      for (const key in bloksTemp) {
        bloksTemp[key] = parseFloat(bloksTemp[key].toFixed(2))
        if (bloksTemp[key] <= 0) delete bloksTemp[key]
      }
      totalStok = parseFloat(totalStok.toFixed(2))

      // Masukkan ke keranjang update
      updates[`stok_benang/${idUnik}/stok`] = totalStok
      updates[`stok_benang/${idUnik}/bloks`] = Object.keys(bloksTemp).length ? bloksTemp : null
    }

    // Tembak sekaligus ke Firebase
    if (Object.keys(updates).length > 0) {
      await update(dbRef(db), updates)
    }
  }

  return { 
    refreshData, 
    kirimTransaksi, 
    kirimMutasi, 
    jalankanAudit 
  }
}
