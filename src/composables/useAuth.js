import { ref } from 'vue'
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { ref as dbRef, onValue } from 'firebase/database'
import { auth, provider, db } from '../firebase' // Pastikan import db

// 🔥 SUPER ADMIN: Email lu nggak akan bisa dihapus hak aksesnya
const SUPER_ADMIN = 'manoramasnif@gmail.com'

export const user = ref(null)
export const currentRole = ref('guest')
export const authReady = ref(false)

let roleListener = null // Untuk nyimpen antrean listener database

export function useAuth() {
  const loginGoogle = () =>
    signInWithPopup(auth, provider).catch(e => alert(e.message))

  const doLogout = () => signOut(auth)

  const initAuth = (cb) => {
    onAuthStateChanged(auth, u => {
      user.value = u
      
      if (u) {
        // Hapus pantauan lama kalau ada
        if (roleListener) roleListener() 
        
        let isFirstLoad = true
        
        // Pantau 'daftar_admin' secara Real-Time dari Firebase
        roleListener = onValue(dbRef(db, 'daftar_admin'), (snap) => {
          const data = snap.val() || {}
          // Ambil semua email dan jadikan huruf kecil biar aman dari typo
          const adminList = Object.values(data).map(email => email.toLowerCase())
          
          const userEmail = u.email.toLowerCase()

          // Cek: Apakah dia Super Admin ATAU ada di daftar database?
          if (userEmail === SUPER_ADMIN || adminList.includes(userEmail)) {
            currentRole.value = 'admin'
          } else {
            currentRole.value = 'guest'
          }

          // cb(u) cuma dipanggil sekali pas pertama kali login/refresh
          // biar nggak nembak refreshData() berkali-kali
          if (isFirstLoad) {
            authReady.value = true
            if (cb) cb(u)
            isFirstLoad = false
          }
        })

      } else {
        // Kalau user belum login atau klik logout
        if (roleListener) {
          roleListener()
          roleListener = null
        }
        currentRole.value = 'guest'
        authReady.value = true
        if (cb) cb(null)
      }
    })
  }

  return { loginGoogle, doLogout, initAuth }
}
