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

/** 16-digit receipt, generated on the client and never sent to the server. */
export function generateReceipt(): string {
  const bytes = sodium.randombytes_buf(16);
  let r = "";
  for (let i = 0; i < 16; i++) r += (bytes[i] % 10).toString();
  return r;
}

async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  const buf = await crypto.subtle.digest("SHA-256", bytes as unknown as BufferSource);
  return new Uint8Array(buf);
}

/** Derive the whistleblower keypair deterministically from the receipt. */
export async function wbKeypair(receipt: string): Promise<WbKeypair> {
  const prv = await sha256(sodium.from_string(receipt)); // 32 bytes = private scalar
  const pub = sodium.crypto_scalarmult_base(prv);
  return { prv, pub, pubB64: b64(pub) };
}

/** Lookup id = sha256(wb_pub_b64) hex — matches the backend's stored hash. */
export async function lookupFor(pubB64: string): Promise<string> {
  return sodium.to_hex(await sha256(sodium.from_string(pubB64)));
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
