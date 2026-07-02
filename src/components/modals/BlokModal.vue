<template>
  <div class="modal fade show d-block backdrop-blur" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered modal-xl">
      <div class="modal-content modern-modal border-0 shadow-lg">
        
        <!-- HEADER -->
        <div class="modal-header border-0 pb-3">
          <div class="w-100">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h5 class="modal-title fw-bold d-flex align-items-center gap-2 m-0">
                <div class="icon-circle bg-primary-subtle text-primary"><i class="fas fa-th-large"></i></div>
                Peta Gudang per Blok
              </h5>
              <div class="d-flex gap-2 align-items-center">
                <button v-if="isAdmin" class="btn btn-sm btn-light-action fw-bold" @click="showKelolaBlok = !showKelolaBlok">
                  <i class="fas fa-cog me-1"></i> Kelola Blok
                </button>
                <button type="button" class="btn-close btn-close-custom" @click="$emit('close')"></button>
              </div>
            </div>
          </div>
        </div>

        <!-- FITUR KELOLA BLOK (DIKEMBALIKAN) -->
        <div v-if="showKelolaBlok && isAdmin" class="kelola-area p-3 mb-2 mx-3 rounded shadow-sm">
          <div class="d-flex gap-2 align-items-center flex-wrap">
            <input type="text" class="form-control form-control-sm custom-input text-uppercase fw-bold" style="max-width:200px" v-model="namaBlokBaru" placeholder="Nama Blok Baru..." @keydown.enter="tambahBlok">
            <button class="btn btn-sm btn-success fw-bold" @click="tambahBlok"><i class="fas fa-plus me-1"></i> Tambah</button>
            <div class="d-flex gap-2 flex-wrap ms-2">
              <span v-for="blok in masterBlok" :key="blok.id" class="badge-soft badge-soft-primary d-flex align-items-center gap-2 px-3 py-2">
                {{ blok.nama }} <i class="fas fa-times opacity-50" style="cursor:pointer" @click="hapusBlok(blok.id)"></i>
              </span>
            </div>
          </div>
        </div>

        <!-- SEARCH -->
        <div class="px-3 pb-3">
          <div class="search-container shadow-sm">
            <i class="fas fa-search me-2 text-muted"></i>
            <input type="text" class="search-input" placeholder="Cari Kode, Nama, atau Warna..." v-model="searchBlok">
          </div>
        </div>

        <!-- MODAL BODY -->
        <div class="modal-body p-3 pt-0" style="max-height:65vh;overflow-y:auto;">
          <div class="row g-3">
            <div v-for="blok in blokData" :key="blok.nama" class="col-12 col-md-6 col-lg-4">
              <div class="blok-card shadow-sm" :class="activeBlok === blok.nama ? 'blok-active' : ''" @click="toggleBlok(blok.nama)">
                <div class="blok-header d-flex justify-content-between align-items-center">
                  <div>
                    <h6 class="fw-bold mb-1"><i class="fas fa-warehouse opacity-50 me-1"></i> {{ blok.nama }}</h6>
                    <div class="fw-bold fs-5">{{ fmt(blok.totalStok) }} <small>Kg</small></div>
                  </div>
                  <span class="badge bg-white text-primary fw-bold">{{ blok.items.length }} Item</span>
                </div>

                <div v-if="activeBlok === blok.nama" class="blok-items">
                  <!-- DATA BARANG + NAMA WARNA -->
                  <div v-for="item in blok.items" :key="item.idUnik" class="blok-item-row" @click.stop>
                    <div class="d-flex justify-content-between align-items-center">
                      <div>
                        <div class="fw-bold" style="font-size:.85rem">{{ item.nama }}</div>
                        <div class="small text-indigo" style="font-size:.75rem">{{ item.warna || '-' }}</div>
                        <div class="font-monospace text-muted" style="font-size:.7rem">{{ item.kodeErp }}</div>
                      </div>
                      
                      <!-- FITUR EDIT STOK (DIKEMBALIKAN) -->
                      <div class="text-end">
                        <div v-if="editingItem === item.idUnik + blok.nama" class="d-flex gap-1">
                          <input type="number" class="form-control form-control-sm" style="width:70px" v-model="editStokVal" @keydown.enter="simpanStokBlok(item, blok.nama)">
                          <button class="btn btn-xs btn-success" @click="simpanStokBlok(item, blok.nama)"><i class="fas fa-check"></i></button>
                        </div>
                        <div v-else class="fw-bold text-success">
                          {{ fmt(item.stokDiBlok) }} Kg 
                          <i class="fas fa-pencil-alt ms-1 text-muted" style="cursor:pointer" @click="bukaEditStok(item, blok.nama)"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  </div>
</template>

<script setup>
// [Logika di sini tetap sama dengan file asli yang lu punya, 
// hanya pastikan 'item.warna' sudah masuk ke mapping 'blokData']
// ... (tambahkan mapping item.warna ke dalam blokData computed property lu)
</script>

<style scoped>
/* Pastikan CSS lu tetap menggunakan class-class aslinya */
.text-indigo { color: #6366f1; }
/* ... (sisa style asli lu) */
</style>
