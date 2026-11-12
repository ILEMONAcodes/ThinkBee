import { decodeBytes, equalBytes } from "@/lib/app-lock/encoding";
import { LockError } from "@/lib/app-lock/errors";

export async function checkAuthenticatorData(data: ArrayBuffer, rpId: string): Promise<void> {
  const bytes = new Uint8Array(data);
  const expected = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rpId)));
  if (bytes.length < 37 || !equalBytes(bytes.slice(0, 32), expected) || (bytes[32] & 5) !== 5) throw new LockError("device");
}

export function checkClientData(data: ArrayBuffer, challenge: string, origin: string, type: string): void {
  const client: unknown = JSON.parse(new TextDecoder().decode(data));
  if (!client || typeof client !== "object" || !("challenge" in client) || client.challenge !== challenge
    || !("origin" in client) || client.origin !== origin || !("type" in client) || client.type !== type
    || ("crossOrigin" in client && client.crossOrigin !== false)) throw new LockError("device");
}

// Authenticators return ASN.1 DER ECDSA signatures; Web Crypto expects r || s.
export function rawEcdsaSignature(signature: ArrayBuffer): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(signature);
  if (bytes.length < 8 || bytes[0] !== 0x30 || bytes[1] !== bytes.length - 2) throw new LockError("device");
  let offset = 2;
  const result = new Uint8Array(64);
  for (let part = 0; part < 2; part++) {
    if (bytes[offset++] !== 2) throw new LockError("device");
    const size = bytes[offset++];
    if (size < 1 || size > 33 || offset + size > bytes.length || (bytes[offset] & 0x80)) throw new LockError("device");
    let integer = bytes.slice(offset, offset + size);
    offset += size;
    if (integer[0] === 0) {
      if (integer.length > 1 && !(integer[1] & 0x80)) throw new LockError("device");
      integer = integer.slice(1);
    }
    if (integer.length > 32) throw new LockError("device");
    result.set(integer, part * 32 + 32 - integer.length);
  }
  if (offset !== bytes.length) throw new LockError("device");
  return result;
}

export async function verifyDeviceSignature(publicKey: string, response: AuthenticatorAssertionResponse): Promise<void> {
  const key = await crypto.subtle.importKey("spki", decodeBytes(publicKey), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  const clientHash = new Uint8Array(await crypto.subtle.digest("SHA-256", response.clientDataJSON));
  const signed = new Uint8Array([...new Uint8Array(response.authenticatorData), ...clientHash]);
  const valid = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, rawEcdsaSignature(response.signature), signed);
  if (!valid) throw new LockError("device");
}
