# Gudang Warna — Inventory & Warehouse Operations App

A warehouse inventory application built with **Vue 3 + Vite + Firebase**.

This project focuses on practical warehouse workflows: authenticated access, inventory visibility, stock transactions, history, physical stock checks, location/block handling, and operational administration.

## Why I built it

I built this project from a real operational perspective rather than as a generic CRUD demo. The goal is to turn recurring warehouse activities into a structured digital workflow with clearer stock visibility and traceability.

## Key capabilities

- Google/Firebase authentication
- Role-based operational access
- Inventory listing and search/filter workflow
- Stock transactions and transaction history
- Random physical stock checking with location/block information
- Physical-vs-system discrepancy audit workflow
- Daily and monthly operational views
- Surat jalan / document workflow
- Batch and location/block management
- Admin management
- Offline/online connection status handling
- Progressive item loading for large datasets
- Firebase-backed data synchronization

## Tech Stack

- **Frontend:** Vue 3
- **Build tool:** Vite
- **Backend / data services:** Firebase
- **Authentication:** Firebase Authentication
- **Database:** Firebase Realtime Database

## Project Structure

```
src/
├── components/
├── composables/
├── scripts/
├── assets/
├── App.vue
├── firebase.js
└── main.js

database-backups/
```

The application separates UI components from operational state/workflow logic through reusable Vue components and composables.

## Operational Focus

This project demonstrates practical understanding of:

- Inventory control
- Stock accuracy
- Physical stock checking
- Warehouse transaction traceability
- Location/block management
- Role-based operational control
- Digitalization of manual warehouse workflows

## Related Projects

- [FinishGoodWH — Finished Goods / Carton Tracker](https://github.com/AurumXSNIF94/FinishGoodWH)
- [PPFG WMS — Fullstack Warehouse Admin](https://github.com/AurumXSNIF94/ppfg)

## Author

**Masfiyal Illah**  
Inventory Control • ERP • Production Planning • Warehouse Operations
