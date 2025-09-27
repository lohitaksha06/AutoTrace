use sha2::{Digest, Sha256};
use serde::Deserialize;

fn hash_bytes(data: &[u8]) -> [u8; 32] {
    let mut h = Sha256::new();
    h.update(data);
    let out = h.finalize();
    let mut arr = [0u8; 32];
    arr.copy_from_slice(&out);
    arr
}

fn hash_hex(data: &[u8]) -> String {
    hex::encode(hash_bytes(data))
}

fn merkle_root(leaves: &[Vec<u8>]) -> String {
    if leaves.is_empty() {
        return hex::encode([0u8; 32]);
    }
    let mut layer: Vec<[u8; 32]> = leaves.iter().map(|l| hash_bytes(l)).collect();
    while layer.len() > 1 {
        let mut next = Vec::with_capacity((layer.len() + 1) / 2);
        for i in (0..layer.len()).step_by(2) {
            let left = layer[i];
            let right = if i + 1 < layer.len() { layer[i + 1] } else { layer[i] };
            let mut cat = Vec::with_capacity(64);
            cat.extend_from_slice(&left);
            cat.extend_from_slice(&right);
            next.push(hash_bytes(&cat));
        }
        layer = next;
    }
    hex::encode(layer[0])
}

#[derive(Deserialize)]
#[serde(tag = "op")]
enum Op {
    #[serde(rename = "hash")] Hash { payload: String },
    #[serde(rename = "merkle-root")] MerkleRoot { leaves: Vec<String> },
}

fn main() {
    let stdin = std::io::read_to_end(std::io::stdin()).expect("read stdin");
    let input: Op = serde_json::from_slice(&stdin).expect("invalid json");
    match input {
        Op::Hash { payload } => {
            let out = hash_hex(payload.as_bytes());
            println!("{}", out);
        }
        Op::MerkleRoot { leaves } => {
            let bytes: Vec<Vec<u8>> = leaves.into_iter().map(|s| s.into_bytes()).collect();
            let root = merkle_root(&bytes);
            println!("{}", root);
        }
    }
}
