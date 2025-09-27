# Architecture

```
+-------------------------+        +-------------------+
| Next.js Frontend (UI)  |  HTTP  |  Axum API (Rust)  |
+-------------------------+ <----> +-------------------+
             |                               |
             | SQLx (Postgres)               | IPFS (docs)
             v                               v
      +-------------+                   +----------+
      |  PostgreSQL |                   |   IPFS   |
      +-------------+                   +----------+
             |
             | Merkle/hash (Rust)
             v
      +----------------+
      | Solana Program |
      |   (Anchor)     |
      +----------------+
```

## Data Flow
- UI -> Axum: validate and persist event (PENDING)
- Axum: compute hash/Merkle; optional IPFS upload
- Axum -> Solana: submit instruction with hash/root
- On confirmation: update DB to ON_CHAIN with tx signature
- UI: poll/subscribe for status updates

## Notes
- RBAC with JWT, request-id logging and correlation to chain tx
- Postgres is the source of truth for full data; on-chain stores only minimal hashes/roots
