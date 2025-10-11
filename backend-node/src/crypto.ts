import crypto from 'crypto';

export function sha256Hex(data: Buffer | string): string {
  const buf = typeof data === 'string' ? Buffer.from(data) : data;
  return crypto.createHash('sha256').update(buf).digest('hex');
}

// Deterministic JSON stringify with sorted keys
export function canonicalJSONStringify(input: unknown): string {
  return JSON.stringify(sortKeys(input));
}

function sortKeys(value: any): any {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc: any, k) => {
        acc[k] = sortKeys(value[k]);
        return acc;
      }, {} as any);
  }
  return value;
}

export type ProofItem = { pos: 'L' | 'R'; hash: string };

export function merkleRoot(leavesHex: string[]): string | null {
  if (leavesHex.length === 0) return null;
  let level = leavesHex.map((h) => h.toLowerCase());
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] ?? level[i];
      const combined = Buffer.concat([Buffer.from(left, 'hex'), Buffer.from(right, 'hex')]);
      next.push(sha256Hex(combined));
    }
    level = next;
  }
  return level[0];
}

export function merkleProof(leavesHex: string[], leafIndex: number): ProofItem[] {
  if (leavesHex.length === 0) return [];
  let idx = leafIndex;
  let level = leavesHex.map((h) => h.toLowerCase());
  const proof: ProofItem[] = [];
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] ?? level[i];
      if (i === idx || i + 1 === idx) {
        if (i === idx) proof.push({ pos: 'R', hash: right });
        else proof.push({ pos: 'L', hash: left });
        idx = Math.floor(i / 2);
      }
      const combined = Buffer.concat([Buffer.from(left, 'hex'), Buffer.from(right, 'hex')]);
      next.push(sha256Hex(combined));
    }
    level = next;
  }
  return proof;
}

export function verifyProof(leafHex: string, proof: ProofItem[], rootHex: string): boolean {
  let acc = leafHex.toLowerCase();
  for (const p of proof) {
    const pair = p.hash.toLowerCase();
    const combined =
      p.pos === 'L'
        ? Buffer.concat([Buffer.from(pair, 'hex'), Buffer.from(acc, 'hex')])
        : Buffer.concat([Buffer.from(acc, 'hex'), Buffer.from(pair, 'hex')]);
    acc = sha256Hex(combined);
  }
  return acc === rootHex.toLowerCase();
}
