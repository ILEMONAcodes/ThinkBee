export function encodeBytes(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeBytes(encoded: string): Uint8Array<ArrayBuffer> {
  const value = encoded.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(value.padEnd(Math.ceil(value.length / 4) * 4, "=")), (character) => character.charCodeAt(0));
}

export function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let different = 0;
  for (let index = 0; index < left.length; index++) different |= left[index] ^ right[index];
  return different === 0;
}
