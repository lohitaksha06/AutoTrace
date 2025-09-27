# Solana Program (Anchor) — Outline

This folder will contain the Anchor program to anchor event hashes and/or periodic Merkle roots on-chain.

## Accounts
- Registry account (singleton or per-tenant): stores latest Merkle root, counters, authority pubkey
- Optional event account keyed by event hash for inclusion proofs

## Instructions
- submit_event_hash(hash: [u8;32])
- submit_merkle_root(root: [u8;32])

## Validation
- Authority checks (backend signer or allowlist)
- Windowing (e.g., one root per epoch/slot range)

## Off-chain glue
- Backend (Axum) writes to Postgres and IPFS first, computes hash/Merkle
- Backend sends Solana instruction, then updates DB with tx signature on confirmation
