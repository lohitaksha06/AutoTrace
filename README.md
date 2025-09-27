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


## 🚀 Rust Backend Plan (University-level)

Goals
- Tamper-evident vehicle lifecycle with on-chain proofs and IPFS docs
- Role-based access (owner, garage, dealer, admin)
- Strong observability and testing for research/teaching value

Recommended stack
- Web: Axum (tokio), typed routes, layered middlewares (auth, rate limit)
- DB: PostgreSQL + SQLx (async, compile-time query checks), migrations via `sqlx migrate`
- Auth: JWT (access/refresh), argon2 password hashing, RBAC claims
- Storage: IPFS client + pinning service (Pinata/Web3.Storage)
- Chain: Choose either
	- EVM testnet (Anvil/Hardhat locally; `ethers-rs` from Rust)
	- OR Substrate dev node (`substrate-api-client`) with custom pallet later
- Queue/Cache: Redis for rate limiting and background jobs (pin confirmations)
- Telemetry: `tracing` + OpenTelemetry exporter, JSON logs

Domain model (sketch)
- Vehicle { id, vin, owner_id, metadata_uri, created_at }
- ServiceLog { id, vehicle_id, summary, parts[], mileage, doc_uri, on_chain_hash, status }
- Transfer { id, vehicle_id, from_user, to_user, bill_uri, on_chain_hash }
- Dispute { id, vehicle_id, opened_by, reason, status }

API sketch
- POST /api/vehicles { vin, metadata } -> 201 { vehicle }
- GET  /api/vehicles/:id -> { vehicle, logs }
- POST /api/vehicles/:id/logs { summary, parts[], mileage, doc } -> { log }
- POST /api/vehicles/:id/transfer { to_user, bill } -> { transfer }
- POST /api/vehicles/:id/disputes { reason } -> { dispute }
- GET  /api/me/garage -> { vehicles[] }

On-chain write path
1) Persist event in DB as PENDING
2) Hash payload (sha256/keccak256); send tx via `ethers-rs` (EVM) or substrate client
3) On receipt, mark as ON_CHAIN with tx hash/block no.

# AutoTrace — University-Ready Product & Architecture

AutoTrace is a tamper-evident vehicle maintenance ledger for the real world. It combines a React/Next.js frontend, a TypeScript Express API, and Rust-powered cryptographic utilities (Merkle trees, hash chains). Optional: anchor Merkle roots to Ethereum for extra trust.

---

## 1️⃣ Problem Statement

**Vehicle History Fraud:** Used-car buyers and fleet managers struggle to verify service history. Workshops want a tamper-proof record of work done.

> “AutoTrace provides a blockchain-style, tamper-evident maintenance ledger that anyone can verify.”

---

## 2️⃣ Value Proposition

- **Immutable:** Each service record is hash-chained and Merkle-verified.
- **Low-Cost & Scalable:** Uses open-source tech and cloud infra, not heavy custom blockchain fees.
- **Accessible:** REST API + React frontend for garages, owners, and buyers.

---

## Engineering Focus

- Backend: Rust + Axum (async), structured logging (tracing)
- Database: PostgreSQL + SQLx (compile-time checked queries)
- Crypto: Rust CLI for Merkle/hash; reused in backend logic
- Security: JWT authentication, RBAC, secure REST endpoints
- Blockchain: Solana on-chain program (Anchor) to anchor per-event hashes and/or periodic Merkle roots
- Testing: Unit + integration with Postgres; CI/CD pipeline

---

## High-Level Architecture

```bash
React/Tailwind Frontend (Next.js)
	|
Rust Backend (Axum)
	|
PostgreSQL (via SQLx) + IPFS (docs)
	|
Merkle tree + hash chain logic (Rust)
	|
Solana Program (Anchor) — on-chain anchoring
```

See docs/architecture.md for a diagram and data flow.

---

## Project Structure

```bash
AutoTrace/
├── frontend/        # Next.js (Pages Router) + Tailwind
├── backend-rust/    # Axum API (Rust) + SQLx + JWT (scaffold)
├── contracts/       # Solana (Anchor) program docs/scaffold
├── rust-crypto/     # Rust CLI for hashing/Merkle root
├── docs/            # Architecture diagram + flows
├── .gitignore
└── README.md
```

---

## Running Locally

1. **Frontend**
	- `pnpm install`
	- `pnpm dev`
2. **Backend (Rust)**
	- `cd backend-rust`
	- Create `.env` from `.env.sample` and set `DATABASE_URL`, `SOLANA_RPC_URL`, `JWT_SECRET`
	- Build: `cargo build`
	- Run: `cargo run`
3. **Rust crypto**
	- `cd rust-crypto`
	- `cargo build --release`
	- `echo '{"op":"hash","payload":"hello"}' | target/release/autotrace-crypto`

---

## Next Steps

- Add JWT middleware, user model, RBAC
- Add IPFS uploads; store CIDs in Postgres with CIDs
- Anchor per-event hashes and/or weekly Merkle root to Solana
- WebSocket push for status updates