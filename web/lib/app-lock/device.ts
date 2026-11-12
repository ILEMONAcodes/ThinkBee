import { checkAuthenticatorData, checkClientData, verifyDeviceSignature } from "@/lib/app-lock/assertion";
import { appLockConfig } from "@/lib/app-lock/policy";
import { decodeBytes, encodeBytes, equalBytes } from "@/lib/app-lock/encoding";
import { LockError } from "@/lib/app-lock/errors";
import type { DeviceCredential } from "@/lib/app-lock/storage";

export async function supportsDeviceUnlock(): Promise<boolean> {
  try {
    return window.isSecureContext && typeof PublicKeyCredential !== "undefined"
      && typeof AuthenticatorAttestationResponse !== "undefined"
      && "getPublicKey" in AuthenticatorAttestationResponse.prototype
      && "getPublicKeyAlgorithm" in AuthenticatorAttestationResponse.prototype
      && "getAuthenticatorData" in AuthenticatorAttestationResponse.prototype
      && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch { return false; }
}

function deviceFailure(error: unknown): LockError {
  return error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "AbortError")
    ? new LockError("cancelled") : new LockError("device");
}

export async function createDeviceCredential(signal: AbortSignal, label: string): Promise<DeviceCredential> {
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userHandle = crypto.getRandomValues(new Uint8Array(32));
    const credential = await navigator.credentials.create({ signal, publicKey: {
      challenge, rp: { id: location.hostname, name: "Think Bee" },
      user: { id: userHandle, name: label, displayName: label },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }], attestation: "none",
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" },
      timeout: appLockConfig.credentialTimeoutMs,
    } });
    if (!(credential instanceof PublicKeyCredential) || !(credential.response instanceof AuthenticatorAttestationResponse)) throw new LockError("device");
    const response = credential.response;
    checkClientData(response.clientDataJSON, encodeBytes(challenge), location.origin, "webauthn.create");
    await checkAuthenticatorData(response.getAuthenticatorData(), location.hostname);
    const publicKey = response.getPublicKey();
    if (!publicKey || response.getPublicKeyAlgorithm() !== -7) throw new LockError("device");
    return { id: encodeBytes(new Uint8Array(credential.rawId)), publicKey: encodeBytes(new Uint8Array(publicKey)), userHandle: encodeBytes(userHandle) };
  } catch (error) { throw deviceFailure(error); }
}

export async function verifyDeviceCredential(device: DeviceCredential, signal: AbortSignal): Promise<void> {
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const credential = await navigator.credentials.get({ signal, publicKey: {
      challenge, rpId: location.hostname, userVerification: "required",
      allowCredentials: [{ id: decodeBytes(device.id), type: "public-key", transports: ["internal"] }],
      timeout: appLockConfig.credentialTimeoutMs,
    } });
    if (!(credential instanceof PublicKeyCredential) || !(credential.response instanceof AuthenticatorAssertionResponse)
      || !equalBytes(new Uint8Array(credential.rawId), decodeBytes(device.id))) throw new LockError("device");
    const response = credential.response;
    checkClientData(response.clientDataJSON, encodeBytes(challenge), location.origin, "webauthn.get");
    await checkAuthenticatorData(response.authenticatorData, location.hostname);
    if (response.userHandle && !equalBytes(new Uint8Array(response.userHandle), decodeBytes(device.userHandle))) throw new LockError("device");
    await verifyDeviceSignature(device.publicKey, response);
  } catch (error) { throw deviceFailure(error); }
}
