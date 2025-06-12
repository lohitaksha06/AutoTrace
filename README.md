# AutoTrace 🚗🔗

**A decentralized vehicle maintenance and repair tracking system using Blockchain and IPFS.**

---

## 📌 Overview

AutoTrace is a blockchain-based solution for **automotive maintenance tracking**. It allows car owners, service centers, and manufacturers to **log and verify repair history, ownership transfers, and part replacements** in a tamper-proof way.

With rising concerns around vehicle fraud, counterfeit parts, and lack of transparent service history, AutoTrace aims to **bring trust, traceability, and security** into the automotive ecosystem.

---

## 🎯 Key Features

- 🔐 **Blockchain-Powered Records** — Service logs are permanently stored and cannot be tampered with.
- 🧾 **Verifiable Repair History** — Buyers or service centers can verify past repairs or maintenance instantly.
- 🧩 **Part Replacement Traceability** — Track if original manufacturer parts were used in service.
- 🏷️ **Ownership Change Logs** — When a car is sold, history stays intact and verifiable.
- 🗂️ **Decentralized Storage with IPFS** — Supporting documents (invoices, photos) stored securely and accessibly.

---

## ⚙️ Tech Stack

| Layer        | Technology                           |
|-------------|---------------------------------------|
| **Frontend**| React + TypeScript                    |
| **Backend** | Rust + Axum (Web API framework)       |
| **Database**| SQLite (for off-chain quick access)   |
| **Blockchain** | Solana (Smart contracts in Rust)  |
| **Storage** | IPFS (InterPlanetary File System)     |
| **Hashing** | SHA-256 for data integrity            |
| **Others**   | Git, GitHub, VS Code, Postman, etc.  |

---

## 🛠️ Project Structure

```bash
AutoTrace/
├── frontend/        # React + Vite based UI
├── backend/         # Rust + Axum API services
├── contracts/       # Smart contracts (Solana or Ethereum)
├── docs/            # Architecture diagrams, workflows
├── README.md
