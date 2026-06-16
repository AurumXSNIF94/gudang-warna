import { ref } from 'vue'
import { ref as dbRef, onValue, update, get } from 'firebase/database'
import { db } from '../firebase'

export const dbStok = ref([])
export const loading = ref(true)

export function useStok() {
  
  const refreshData = () => {
    loading.value = true
    onValue(dbRef(db, 'stok_benang'), (snap) => {
      const data = snap.val() || {}
      dbStok.value = Object.keys(data).map(k => ({ idUnik: k, ...data[k] }))
      loading.value = false
    })
  }

  // 🔥 INI FUNGSI DEWA-NYA (SINGLE SOURCE OF TRUTH)
  // Fungsi ini akan dipanggil tiap kali ada penambahan, editan, atau hapus riwayat.
  const sinkronisasiStok = async (idUnik) => {
    const snapRiwayat = await get(dbRef(db, `riwayat_transaksi/${idUnik}`))
    const logs = snapRiwayat.val() || {}
    
    // Urutkan dari yang tertua ke terbaru
    const history = Object.values(logs).sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal))
    
    let realStok = 0
    let realBloks = {}

    // Hitung mutlak dari buku riwayat
    history.forEach(l => {
      const q = parseFloat(l.qty) || 0
      const b = l.blok || ''

      if (l.tipe === 'MASUK') {
        realStok += q
        if (b && b !== 'Tanpa Lokasi') realBloks[b] = (parseFloat(realBloks[b]) || 0) + q
      } 
      else if (l.tipe === 'KELUAR') {
        realStok -= q
        if (b && b !== 'Tanpa Lokasi') realBloks[b] = (parseFloat(realBloks[b]) || 0) - q
      } 
      else if (l.tipe === 'OPNAME') {
        if (b && b !== 'Tanpa Lokasi') {
          const lama = parseFloat(realBloks[b]) || 0
          realStok += (q - lama)
          realBloks[b] = q
        } else {
          realStok = q
        }
      }
      else if (l.tipe === 'MUTASI') {
        if (b.includes('->')) {
          const [asal, tujuan] = b.split('->').map(s => s.trim())
          if (asal !== 'Tanpa Lokasi') realBloks[asal] = (parseFloat(realBloks[asal]) || 0) - q
          if (tujuan !== 'Tanpa Lokasi') realBloks[tujuan] = (parseFloat(realBloks[tujuan]) || 0) + q
        }
      }
    })

    // Bersihkan angka koma dan blok mati
    realStok = parseFloat(realStok.toFixed(2))
    for (let k in realBloks) {
      realBloks[k] = parseFloat(realBloks[k].toFixed(2))
      if (realBloks[k] <= 0) delete realBloks[k]
    }

    // PAKSA UPDATE KE DATABASE UTAMA
    const updates = {}
    updates[`stok_benang/${idUnik}/stok`] = realStok
    updates[`stok_benang/${idUnik}/bloks`] = Object.keys(realBloks).length ? realBloks : null
    
    await update(dbRef(db), updates)
  }

  // Fungsi Transaksi sekarang CUMA NYATET RIWAYAT. Sisanya diserahkan ke sinkronisasiStok.
  const kirimTransaksi = async (idUnik, tipe, qty, ket, blokNama) => {
    const item = dbStok.value.find(x => x.idUnik === idUnik)
    if (!item) throw new Error('Data Barang tidak ditemukan.')
    
    const iso = new Date().toISOString()
    const trxId = 'TRX_' + Date.now()
    
    // Cuma nyatet riwayat ke database
    await update(dbRef(db, `riwayat_transaksi/${idUnik}/${trxId}`), {
      trxId, kodeErp: item.kodeErp, tipe, qty: parseFloat(qty),
      blok: blokNama || '', keterangan: (ket || '').toUpperCase(), tanggal: iso
    })

    // Paksa sinkronisasi
    await sinkronisasiStok(idUnik)
  }

  const kirimMutasi = async (idUnik, qty, blokAsal, blokTujuan) => {
    const item = dbStok.value.find(x => x.idUnik === idUnik)
    const iso = new Date().toISOString()
    const trxId = 'MUT_' + Date.now()
    
    await update(dbRef(db, `riwayat_transaksi/${idUnik}/${trxId}`), {
      trxId, kodeErp: item.kodeErp, tipe: 'MUTASI', qty: parseFloat(qty),
      blok: `${blokAsal} -> ${blokTujuan}`, keterangan: `PINDAH LOKASI`, tanggal: iso
    })

    await sinkronisasiStok(idUnik)
  }

  return { refreshData, kirimTransaksi, kirimMutasi, sinkronisasiStok }
}
