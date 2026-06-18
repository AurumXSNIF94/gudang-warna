import { ref } from 'vue'
import { ref as dbRef, onValue, update, get } from 'firebase/database'
import { db } from '../firebase'

export const dbStok = ref([])
export const itemVelocity = ref({})
export const loading = ref(false)

let isListening = false 
let isAuditing = false 

export function useStok() {
  
  const kalkulasiVelocity = (dataArray) => {
    const vel = {}
    dataArray.forEach(item => {
      const s = parseFloat(item.stok) || 0
      if (s <= 0) vel[item.idUnik] = 'DEAD'
      else if (s < 500) vel[item.idUnik] = 'SLOW'
      else if (s < 2900) vel[item.idUnik] = 'MEDIUM'
      else vel[item.idUnik] = 'FAST'
    })
    itemVelocity.value = vel
  }

  const refreshData = () => {
    if (isListening) return
    isListening = true
    
    loading.value = true
    onValue(dbRef(db, 'stok_benang'), snap => {
      const data = snap.val()
      const arr = []
      if (data) {
        Object.keys(data).forEach(k => {
          if (data[k]) arr.push({ ...data[k], idUnik: k })
        })
        arr.sort((a, b) => (b.stok || 0) - (a.stok || 0))
      }
      dbStok.value = arr
      
      kalkulasiVelocity(arr) 
      loading.value = false
    })
  }

  const jalankanAudit = async () => {
    if (isAuditing) return
    isAuditing = true
    
    try {
      const [snapM, snapH] = await Promise.all([
        get(dbRef(db, 'stok_benang')),
        get(dbRef(db, 'riwayat_transaksi'))
      ])
      
      const masters = snapM.val() || {}
      const histories = snapH.val() || {}
      const updates = {}

      Object.keys(masters).forEach(parentId => {
        let totalStok = Number(masters[parentId].stokAwal) || 0
        const logs = histories[parentId] ? Object.values(histories[parentId]) : []
        logs.sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal))

        const bloksTemp = {}
        
        logs.forEach(l => {
          const q = Number(l.qty) || 0
          const rawBlok = (l.blok || "").trim().toUpperCase()
          let lokasi = (rawBlok === "" || rawBlok === "TANPA LOKASI") ? "Tanpa Lokasi" : rawBlok

          if (l.tipe === 'MASUK') {
            totalStok += q
            bloksTemp[lokasi] = (bloksTemp[lokasi] || 0) + q
          } 
          else if (l.tipe === 'KELUAR') {
            totalStok -= q
            bloksTemp[lokasi] = (bloksTemp[lokasi] || 0) - q
          } 
          else if (l.tipe === 'OPNAME') {
            const stokBlokLama = parseFloat(bloksTemp[lokasi] || 0)
            const selisih = q - stokBlokLama
            totalStok += selisih
            bloksTemp[lokasi] = q
          }
          
          updates[`riwayat_transaksi/${parentId}/${l.trxId}/stokAkhir`] = parseFloat(totalStok.toFixed(2))
        })

        updates[`stok_benang/${parentId}/stok`] = parseFloat(totalStok.toFixed(2))
        
        // Peta Blok visual aman dari audit
        // updates[`stok_benang/${parentId}/bloks`] = Object.keys(bloksTemp).length > 0 ? bloksTemp : null
      })

      await update(dbRef(db), updates)
      console.log("Audit Selesai.")
    } catch (e) {
      console.error("Audit Gagal:", e)
    } finally {
      isAuditing = false
    }
  }

  // 🔥 HELPER BARU: Otomatis menolak dan membunuh "Tanpa Lokasi" agar tidak masuk database
  const bersihkanBlok = (bloksObj) => {
    Object.keys(bloksObj).forEach(b => {
      const upperB = String(b).trim().toUpperCase()
      if (upperB.includes('TANPA LOKASI') || upperB === 'NULL' || upperB === '' || Math.abs(bloksObj[b]) <= 0.001) {
        delete bloksObj[b]
      } else {
        bloksObj[b] = parseFloat(bloksObj[b].toFixed(2))
      }
    })
  }

  const kirimTransaksi = async (idUnik, tipe, qty, ket, lokasiBaru) => {
    const item = dbStok.value.find(x => x.idUnik === idUnik)
    if (!item) return
    
    const sLama = Number(item.stok) || 0
    const bloks = { ...(item.bloks || {}) }
    
    // Gembok anti-siluman
    const rawBlok = (lokasiBaru || "").trim().toUpperCase()
    let blokNama = (rawBlok === "" || rawBlok.includes("TANPA LOKASI")) ? "" : rawBlok

    let stokBlokLama = parseFloat(bloks[blokNama] || 0)
    let sBaru = sLama

    if (tipe === 'MASUK') {
      sBaru = sLama + qty
      if (blokNama) bloks[blokNama] = stokBlokLama + qty
    } 
    else if (tipe === 'KELUAR') {
      sBaru = sLama - qty
      if (blokNama) bloks[blokNama] = stokBlokLama - qty
    } 
    else if (tipe === 'OPNAME') {
      if (blokNama) {
        const selisih = qty - stokBlokLama
        sBaru = sLama + selisih
        bloks[blokNama] = qty
      } else {
        sBaru = qty
      }
    }

    sBaru = parseFloat(sBaru.toFixed(2))
    bersihkanBlok(bloks)

    const now = new Date()
    const trxId = 'TRX_' + now.getTime()
    const updates = {}
    
    updates[`stok_benang/${idUnik}/stok`] = sBaru
    updates[`stok_benang/${idUnik}/bloks`] = Object.keys(bloks).length > 0 ? bloks : null
    updates[`stok_benang/${idUnik}/tglUpdate`] = now.toISOString()
    
    updates[`riwayat_transaksi/${idUnik}/${trxId}`] = {
      trxId,
      qty: qty, 
      stokAkhir: sBaru,
      tanggal: now.toISOString(),
      tipe,
      blok: lokasiBaru || "", 
      keterangan: ket
    }
    
    await update(dbRef(db), updates)
  }

  const kirimMutasi = async (idUnik, qty, blokAsal, blokTujuan) => {
    const snap = await get(dbRef(db, `stok_benang/${idUnik}`))
    const item = snap.val()
    if (!item) return

    const bloks = { ...(item.bloks || {}) }
    const asal = (blokAsal || "").trim().toUpperCase()
    const tujuan = (blokTujuan || "").trim().toUpperCase()

    // Gembok mutasi
    if (asal && !asal.includes("TANPA LOKASI")) {
      bloks[asal] = parseFloat(parseFloat(bloks[asal] || 0).toFixed(2)) - qty
    }
    if (tujuan && !tujuan.includes("TANPA LOKASI")) {
      bloks[tujuan] = parseFloat(parseFloat(bloks[tujuan] || 0).toFixed(2)) + qty
    }

    bersihkanBlok(bloks)

    const updates = {}
    updates[`stok_benang/${idUnik}/bloks`] = Object.keys(bloks).length > 0 ? bloks : null
    updates[`stok_benang/${idUnik}/tglUpdate`] = new Date().toISOString()

    await update(dbRef(db), updates)
  }

  // 🔥 TOMBOL SAKTI: Sapu Bersih Database 🔥
  const sapuBersihDatabase = async () => {
    try {
      const snap = await get(dbRef(db, 'stok_benang'))
      const allData = snap.val() || {}
      const updates = {}
      let count = 0

      Object.keys(allData).forEach(idUnik => {
        const item = allData[idUnik]
        if (item.bloks) {
          let bloksBersih = { ...item.bloks }
          let adaSiluman = false

          Object.keys(bloksBersih).forEach(k => {
            const upperK = String(k).trim().toUpperCase()
            if (upperK.includes('TANPA LOKASI') || upperK === 'NULL' || upperK === '') {
              delete bloksBersih[k] 
              adaSiluman = true
            }
          })

          if (adaSiluman) {
            updates[`stok_benang/${idUnik}/bloks`] = Object.keys(bloksBersih).length > 0 ? bloksBersih : null
            count++
          }
        }
      })

      if (count > 0) {
        await update(dbRef(db), updates)
        window.Swal?.fire('Sukses', `Berhasil menghapus folder siluman dari ${count} barang!`, 'success')
      } else {
        window.Swal?.fire('Aman', 'Database sudah bersih! Tidak ada blok siluman.', 'info')
      }
    } catch (error) {
      console.error("Gagal sapu bersih:", error)
      window.Swal?.fire('Error', 'Gagal menyapu database', 'error')
    }
  }

  // Pastikan sapuBersihDatabase di-export
  return { refreshData, jalankanAudit, kirimTransaksi, kirimMutasi, sapuBersihDatabase } 
}
