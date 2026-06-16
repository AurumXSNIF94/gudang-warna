import { ref } from 'vue'
import { ref as dbRef, onValue, update, get } from 'firebase/database'
import { db } from '../firebase'

export const dbStok = ref([])
export const itemVelocity = ref({})
export const loading = ref(false)

let isListening = false 
let isAuditing = false 

export function useStok() {
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
      loading.value = false
    })
  }

  // === FITUR AUDIT GLOBAL HARMONIS (ANTI-BENTROK 3 FITUR) ===
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

        // 1. Ambil snapshot pembagian blok riil yang ada saat ini di database
        const bloksTemp = { ...(masters[parentId].bloks || {}) }
        
        // 2. Hitung totalStok secara mutlak dari histori transaksi aplikasi
        logs.forEach(l => {
          const q = Number(l.qty) || 0
          const rawBlok = (l.blok || "").trim().toUpperCase()
          let lokasi = (rawBlok === "" || rawBlok === "TANPA LOKASI") ? "Tanpa Lokasi" : rawBlok

          if (l.tipe === 'MASUK') {
            totalStok += q
          } 
          else if (l.tipe === 'KELUAR') {
            totalStok -= q
          } 
          else if (l.tipe === 'OPNAME') {
            // Jika ada record opname global atau opname per blok, riwayat memegang total penyesuaian baru
            if (lokasi !== "Tanpa Lokasi") {
              bloksTemp[lokasi] = q // Kunci nilai opname spesifik pada blok tersebut
            }
            
            // Kalkulasi ulang totalStok mengikuti dampak log opname
            // Kita hitung berdasarkan log transaksi yang terekam aman di riwayat
            const logStokAkhir = Number(l.stokAkhir)
            if (!isNaN(logStokAkhir)) {
              totalStok = logStokAkhir
            }
          }
          
          updates[`riwayat_transaksi/${parentId}/${l.trxId}/stokAkhir`] = parseFloat(totalStok.toFixed(2))
        })

        // 3. Selaraskan distribusi blok hasil Mutasi Manual & Opname Blok dengan Total Stok Baru
        // Hitung total berat yang saat ini sudah dikunci di dalam blok-blok fisik (selain Tanpa Lokasi)
        const totalDiBlokFisik = Object.entries(bloksTemp)
          .filter(([nama]) => nama !== 'Tanpa Lokasi' && nama !== '')
          .reduce((sum, [_, qty]) => sum + (parseFloat(qty) || 0), 0)

        // Sisa dari total stok dikurangi alokasi blok fisik akan otomatis dibuang ke "Tanpa Lokasi"
        let sisaTanpaLokasi = totalStok - totalDiBlokFisik
        
        if (sisaTanpaLokasi > 0.005) {
          bloksTemp['Tanpa Lokasi'] = parseFloat(sisaTanpaLokasi.toFixed(2))
        } else {
          // Jika minus (akibat pengeluaran barang belum dialokasikan) atau nol, bersihkan badge Tanpa Lokasi
          delete bloksTemp['Tanpa Lokasi']
        }

        // 4. Bersihkan blok yang nilainya 0 atau kosong agar database tetap bersih
        Object.keys(bloksTemp).forEach(b => {
          if (Math.abs(bloksTemp[b]) <= 0.001 || bloksTemp[b] < 0) {
            delete bloksTemp[b]
          } else {
            bloksTemp[b] = parseFloat(bloksTemp[b].toFixed(2))
          }
        })

        // 5. Daftarkan antrean pembaruan ke Firebase
        updates[`stok_benang/${parentId}/stok`] = parseFloat(totalStok.toFixed(2))
        updates[`stok_benang/${parentId}/bloks`] = Object.keys(bloksTemp).length > 0 ? bloksTemp : null
      })

      // Jalankan seluruh pembaruan secara atomic (serentak)
      await update(dbRef(db), updates)
      console.log("Audit Global Harmonis Berhasil Selesai.")
    } catch (e) {
      console.error("Audit Gagal:", e)
    } finally {
      isAuditing = false
    }
  }

  // === FITUR TRANSAKSI MASUK, KELUAR, DAN OPNAME JALUR UTAMA ===
  const kirimTransaksi = async (idUnik, tipe, qty, ket, lokasiBaru) => {
    const item = dbStok.value.find(x => x.idUnik === idUnik)
    if (!item) return
    
    const sLama = Number(item.stok) || 0
    const bloks = { ...(item.bloks || {}) }
    
    const rawBlok = (lokasiBaru || "").trim().toUpperCase()
    let blokNama = (rawBlok === "" || rawBlok === "TANPA LOKASI") ? "Tanpa Lokasi" : rawBlok

    let stokBlokLama = parseFloat(bloks[blokNama] || 0)
    let sBaru = sLama

    if (tipe === 'MASUK') {
      sBaru = sLama + qty
      bloks[blokNama] = stokBlokLama + qty
    } 
    else if (tipe === 'KELUAR') {
      sBaru = sLama - qty
      bloks[blokNama] = stokBlokLama - qty
    } 
    else if (tipe === 'OPNAME') {
      // Logika Opname: Set nilai baru pada blok tujuan, lalu sesuaikan stok total globalnya
      const selisih = qty - stokBlokLama
      sBaru = sLama + selisih
      bloks[blokNama] = qty
    }

    sBaru = parseFloat(sBaru.toFixed(2))
    
    Object.keys(bloks).forEach(b => {
      if (Math.abs(bloks[b]) <= 0.001) delete bloks[b]
      else bloks[b] = parseFloat(bloks[b].toFixed(2))
    })

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

  // === FITUR MUTASI: PINDAH BLOK MANUAL (BEBAS DARI GEJALA TIMPA AUDIT) ===
  const kirimMutasi = async (idUnik, qty, blokAsal, blokTujuan) => {
    const snap = await get(dbRef(db, `stok_benang/${idUnik}`))
    const item = snap.val()
    if (!item) return

    const bloks = { ...(item.bloks || {}) }
    const asal = (blokAsal || "").trim().toUpperCase() || "Tanpa Lokasi"
    const tujuan = (blokTujuan || "").trim().toUpperCase() || "Tanpa Lokasi"

    bloks[asal] = parseFloat(parseFloat(bloks[asal] || 0).toFixed(2)) - qty
    bloks[tujuan] = parseFloat(parseFloat(bloks[tujuan] || 0).toFixed(2)) + qty

    Object.keys(bloks).forEach(b => {
      if (Math.abs(bloks[b]) <= 0.001) delete bloks[b]
      else bloks[b] = parseFloat(bloks[b].toFixed(2))
    })

    const updates = {}
    updates[`stok_benang/${idUnik}/bloks`] = Object.keys(bloks).length > 0 ? bloks : null
    updates[`stok_benang/${idUnik}/tglUpdate`] = new Date().toISOString()

    await update(dbRef(db), updates)
  }

  return { refreshData, jalankanAudit, kirimTransaksi, kirimMutasi } 
}
