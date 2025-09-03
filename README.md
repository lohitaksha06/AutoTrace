# AutoTrace 🚗🔗

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Blockchain](https://img.shields.io/badge/Blockchain-Solana-9945FF?logo=solana)](https://solana.com)
[![Backend](https://img.shields.io/badge/Backend-Rust-DEA584?logo=rust)](https://www.rust-lang.org)
[![Frontend](https://img.shields.io/badge/Frontend-React-61DAFB?logo=react)](https://reactjs.org)

**A decentralized vehicle history and maintenance tracking system built with Blockchain and IPFS to bring trust and transparency to the automotive world.**

---

## 📌 The Problem

The used car market is plagued by a lack of trust. Critical issues like odometer tampering, hidden accident histories, and the use of counterfeit parts are widespread. Existing vehicle history reports are centralized, often incomplete, and can be manipulated. This information asymmetry puts buyers at a significant disadvantage and makes it difficult for honest sellers to prove the true value of their well-maintained vehicles.

## ✨ The Solution: AutoTrace

AutoTrace solves this problem by creating a **single, immutable source of truth** for a vehicle's entire lifecycle. By leveraging the power of the Solana blockchain, we provide a tamper-proof ledger where all service records, ownership changes, and part replacements are recorded permanently and transparently.

Car owners, service centers, and manufacturers can log and verify vehicle data in a decentralized ecosystem, eliminating fraud and ensuring accountability. Supporting documents, such as repair invoices and photos, are stored securely on IPFS, linked directly to the on-chain records.

---

## 🎯 Key Features

-   🔐 **Immutable Service Records**: Every service log—from oil changes to major repairs—is a transaction recorded on the blockchain, making it impossible to alter or delete.
-   🧾 **Instant & Verifiable History**: Anyone with the Vehicle Identification Number (VIN) can instantly access and verify a car's complete maintenance history.
-   🧩 **Genuine Parts Traceability**: Tracks parts back to the manufacturer, ensuring that authentic components were used during repairs.
-   🏷️ **Decentralized Ownership Title**: Ownership transfers are logged on-chain, creating a clear, unbroken, and verifiable chain of custody.
-   🗂️ **Secure Document Storage with IPFS**: Invoices, registration documents, and photographs are stored off-chain on the InterPlanetary File System for decentralized, resilient access, with only the hash stored on-chain.

---

## ⚙️ Technology Stack

| Layer        | Technology                                   | Purpose                                               |
| :----------- | :------------------------------------------- | :---------------------------------------------------- |
| **Frontend** | React + TypeScript + Vite                    | A modern, fast, and type-safe UI for users.           |
| **Backend**  | Rust + Axum                                  | High-performance, memory-safe API services.           |
| **Database** | SQLite                                       | Caching off-chain data for quick, responsive queries. |
| **Blockchain** | [Solana](https://solana.com/) (Smart Contracts in Rust) | Fast, low-cost, and scalable distributed ledger.      |
| **Storage**  | [IPFS](https://ipfs.tech/)                   | Decentralized storage for files and documents.        |
| **Hashing**  | SHA-256                                      | Ensuring cryptographic integrity of all data.         |

---

## 🏛️ System Architecture

AutoTrace operates on a hybrid on-chain/off-chain model to ensure both performance and decentralization.

1.  **On-Chain (Solana)**: Core data points like VIN, service record metadata (date, type of service, workshop ID), ownership transfer hashes, and IPFS content identifiers (CIDs) are stored on-chain. The smart contracts manage the business logic and ensure data integrity.
2.  **Off-Chain (Backend + IPFS)**: The Rust backend handles user requests, interacts with the Solana blockchain, and uploads larger files (invoices, photos) to IPFS. SQLite is used for caching non-critical data to ensure the UI remains fast.
3.  **Frontend (React)**: The user-facing application communicates with the Rust backend API, which acts as the gateway to the on-chain and off-chain data sources.

<!-- TODO: Create and link a simple architecture diagram here -->

---

## 🛠️ Project Structure

```bash
AutoTrace/
├── frontend/        # React + Vite UI. All user-facing components.
├── backend/         # Rust + Axum API. Manages requests and blockchain interaction.
├── contracts/       # Solana smart contracts written in Rust (using Anchor framework).
├── docs/            # Architecture diagrams, API documentation, and workflows.
├── .gitignore
└── README.md