import { describe, expect, it } from "vitest";

import { checkAuthenticatorData, checkClientData, rawEcdsaSignature, verifyDeviceSignature } from "@/lib/app-lock/assertion";
import { encodeBytes } from "@/lib/app-lock/encoding";

const client = (values: object) => new TextEncoder().encode(JSON.stringify(values)).buffer;

function derSignature(raw: ArrayBuffer): ArrayBuffer {
  const bytes = new Uint8Array(raw);
  const parts = [bytes.slice(0, 32), bytes.slice(32)].flatMap((part) => {
    let start = 0;
    while (start < 31 && part[start] === 0) start++;
    const integer = [...part.slice(start)];
    if (integer[0] & 0x80) integer.unshift(0);
    return [2, integer.length, ...integer];
  });
  return new Uint8Array([0x30, parts.length, ...parts]).buffer;
}

async function authenticatorData(): Promise<Uint8Array<ArrayBuffer>> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("app.test"));
  return new Uint8Array([...new Uint8Array(hash), 5, 0, 0, 0, 1]);
}

describe("device verification", () => {
  it("requires the fresh challenge, exact origin and expected operation without cross-origin use", () => {
    const valid = { type: "webauthn.get", origin: "https://app.test", challenge: "fresh", crossOrigin: false };
    expect(() => checkClientData(client(valid), "fresh", valid.origin, valid.type)).not.toThrow();
    for (const changed of [{ challenge: "replayed" }, { origin: "https://other.test" }, { type: "webauthn.create" }, { crossOrigin: true }]) {
      expect(() => checkClientData(client({ ...valid, ...changed }), "fresh", valid.origin, valid.type)).toThrow();
    }
  });

  it("requires the RP hash and both user presence and user verification", async () => {
    const data = await authenticatorData();
    await expect(checkAuthenticatorData(data.buffer, "app.test")).resolves.toBeUndefined();
    await expect(checkAuthenticatorData(data.buffer, "different.test")).rejects.toMatchObject({ code: "device" });
    for (const flags of [0, 1, 4]) {
      data[32] = flags;
      await expect(checkAuthenticatorData(data.buffer, "app.test")).rejects.toMatchObject({ code: "device" });
    }
    await expect(checkAuthenticatorData(data.slice(0, 32).buffer, "app.test")).rejects.toMatchObject({ code: "device" });
  });

  it("verifies a real signed assertion and rejects tampered data, challenge or signature", async () => {
    const key = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
    const publicKey = encodeBytes(new Uint8Array(await crypto.subtle.exportKey("spki", key.publicKey)));
    const authData = await authenticatorData();
    const clientDataJSON = client({ type: "webauthn.get", origin: "https://app.test", challenge: "fresh" });
    const clientHash = new Uint8Array(await crypto.subtle.digest("SHA-256", clientDataJSON));
    const raw = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key.privateKey, new Uint8Array([...authData, ...clientHash]));
    const signature = derSignature(raw);
    expect(rawEcdsaSignature(signature)).toEqual(new Uint8Array(raw));
    const response = { authenticatorData: authData.buffer, clientDataJSON, signature, userHandle: null } as AuthenticatorAssertionResponse;
    await expect(verifyDeviceSignature(publicKey, response)).resolves.toBeUndefined();
    await expect(verifyDeviceSignature(publicKey, { ...response, clientDataJSON: client({ challenge: "changed" }) })).rejects.toThrow();
    authData[36]++;
    await expect(verifyDeviceSignature(publicKey, response)).rejects.toThrow();
    authData[36]--;
    const changedSignature = new Uint8Array(signature.slice(0));
    changedSignature[changedSignature.length - 1] ^= 1;
    await expect(verifyDeviceSignature(publicKey, { ...response, signature: changedSignature.buffer })).rejects.toThrow();
  });

  it("rejects malformed DER lengths, negative integers, padding and trailing data", () => {
    const valid = [0x30, 6, 2, 1, 1, 2, 1, 1];
    expect(rawEcdsaSignature(new Uint8Array(valid).buffer)).toHaveLength(64);
    for (const bytes of [[], [0x31, ...valid.slice(1)], [0x30, 7, ...valid.slice(2)], [0x30, 6, 2, 1, 0x80, 2, 1, 1], [0x30, 7, 2, 2, 0, 1, 2, 1, 1], [...valid, 0]]) {
      expect(() => rawEcdsaSignature(new Uint8Array(bytes).buffer)).toThrow();
    }
  });
});
