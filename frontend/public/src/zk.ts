// Zero-knowledge client crypto (libsodium). Mirrors the backend's sealed-box
// scheme so the server never sees the receipt and never decrypts on re-entry.
import _sodium from "libsodium-wrappers";

let sodium: typeof _sodium;

export async function initZk(): Promise<void> {
  await _sodium.ready;
  sodium = _sodium;
}

export interface WbKeypair {
  prv: Uint8Array;
  pub: Uint8Array;
  pubB64: string;
}

function b64(b: Uint8Array): string {
  return sodium.to_base64(b, sodium.base64_variants.ORIGINAL);
}
function fromB64(s: string): Uint8Array {
  return sodium.from_base64(s, sodium.base64_variants.ORIGINAL);
}

const RECEIPT_DIGITS = 20; // 20 digits ≈ 2^66 (defense-in-depth, was 16/2^53).
const ZK_SALT_INFO = "wv-zk-v2"; // domain separation for the receipt-derived salt.

/** 20-digit receipt, generated on the client and never sent to the server. */
export function generateReceipt(): string {
  const bytes = sodium.randombytes_buf(RECEIPT_DIGITS);
  let r = "";
  for (let i = 0; i < RECEIPT_DIGITS; i++) r += (bytes[i] % 10).toString();
  return r;
}

async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  const buf = await crypto.subtle.digest("SHA-256", bytes as unknown as BufferSource);
  return new Uint8Array(buf);
}

/**
 * Derive the whistleblower keypair from the receipt using a memory-hard KDF
 * (Argon2id), NOT a plain hash. This is the anti-deanonymisation control: an
 * attacker holding a stolen DB + ciphertext can only brute-force the receipt at
 * ~Argon2id cost per guess (64 MiB memory-hard), which makes the 2^66 keyspace
 * computationally closed even for a well-resourced adversary (e.g. the employer).
 * INTERACTIVE limits keep it feasible on low-end mobile devices for the genuine
 * reporter (one derivation), while the 64 MiB memory cost defeats GPU/ASIC
 * parallelism. The salt is deterministic from the receipt so re-entry needs no
 * server round-trip (salts are not secret; the cost, not the salt, is the guard).
 */
export async function wbKeypair(receipt: string): Promise<WbKeypair> {
  const saltSrc = await sha256(sodium.from_string(receipt + ZK_SALT_INFO));
  const salt = saltSrc.slice(0, sodium.crypto_pwhash_SALTBYTES); // 16 bytes
  const prv = sodium.crypto_pwhash(
    32, // 32-byte private scalar
    receipt,
    salt,
    sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_ALG_ARGON2ID13,
  );
  const pub = sodium.crypto_scalarmult_base(prv);
  return { prv, pub, pubB64: b64(pub) };
}

/**
 * Re-entry lookup value = the wb public key itself (a public value, never the
 * receipt). The SERVER applies a peppered HMAC over it to find the report, so a
 * stolen DB cannot reproduce the lookup offline (the pepper never leaves the
 * server). The client therefore sends `pubB64` as-is.
 */
export function lookupValue(pub: WbKeypair): string {
  return pub.pubB64;
}

/** Unseal the report private key with the receipt-derived keypair. */
export function unsealReportPrv(sealedB64: string, kp: WbKeypair): Uint8Array {
  return sodium.crypto_box_seal_open(fromB64(sealedB64), kp.pub, kp.prv);
}

/** Decrypt a sealed-to-report-pub ciphertext to a UTF-8 string. */
export function decryptToString(ctB64: string, reportPrv: Uint8Array): string {
  const reportPub = sodium.crypto_scalarmult_base(reportPrv);
  return sodium.to_string(sodium.crypto_box_seal_open(fromB64(ctB64), reportPub, reportPrv));
}
