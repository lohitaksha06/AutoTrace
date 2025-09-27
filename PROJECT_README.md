# AutoTrace — Product + Architecture Overview

AutoTrace is a tamper-evident vehicle maintenance ledger. It uses a React/Next.js frontend, an Express (TypeScript) API, and Rust-based cryptographic utilities for hash-chains and Merkle proofs. Optional on-chain anchoring can write the weekly Merkle root to an EVM testnet.

## Problem → Solution
- Problem: Buyers and fleets can’t trust vehicle maintenance history; workshops can’t easily prove authenticity.
- Solution: Append-only, verifiable service logs with cryptographic integrity; optional blockchain anchoring.

## Value Proposition
- Immutable: hash-chained logs with Merkle verification
- Low-cost: open-source stack, on-chain anchoring only for roots
- Accessible: REST API + Next.js UI; easy to adopt for garages

## Features to Stand Out
- Analytics dashboard (trends, cost estimates)
- QR code for instant VIN verification
- Roles: Owner, Mechanic, Buyer with permissions
- Optional: Weekly Merkle root anchoring to EVM

## High-Level Architecture

Frontend (Next.js, Tailwind)
  ↕
Express API (TypeScript)
  ↕
MongoDB (main store) + Rust crypto (hash/merkle)
  ↕
Optional: EVM anchoring via ethers.js/ethers-rs (future)

## Repos/Dirs
- frontend/ — Next.js (Pages Router) with Tailwind
- backend-node/ — Express API (TypeScript, MongoDB)
- rust-crypto/ — Rust CLI for hashing/Merkle root

## Running Locally
1) Frontend
   - pnpm install
   - pnpm dev
2) Backend (Node)
   - cd backend-node
   - pnpm install
   - copy .env.sample to .env and set MONGO_URI, DB_NAME, JWT_SECRET
   - pnpm dev
3) Rust crypto
   - cd rust-crypto
   - cargo build --release
   - echo '{"op":"hash","payload":"hello"}' | target/release/autotrace-crypto

## Next Steps
- Add JWT middleware, user model, RBAC
- Add IPFS uploads; store CIDs in Mongo
- Batch logs daily; anchor Merkle root weekly to a testnet
- WebSocket push for status updates