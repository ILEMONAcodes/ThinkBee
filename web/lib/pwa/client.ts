import { PWA_MEANINGFUL_USE_EVENT, PWA_MEANINGFUL_USE_KEY } from "@/lib/pwa/meaningful-use";
import { watchInstallingWorker } from "@/lib/pwa/updates";

type InstallChoice = { outcome: "accepted" | "dismissed"; platform: string };
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
};
type PwaWindow = Window & { __thinkBeeInstallPrompt?: InstallPromptEvent };

export type PwaState = {
  canInstall: boolean;
  installed: boolean;
  isIos: boolean;
  updateAvailable: boolean;
};

const serverState: PwaState = { canInstall: false, installed: false, isIos: false, updateAvailable: false };
let state: PwaState = serverState;
let installPrompt: InstallPromptEvent | null = null;
let registration: ServiceWorkerRegistration | null = null;
let started = false;
let reloadForUpdate = false;
const listeners = new Set<() => void>();

function emit(patch: Partial<PwaState>): void {
  state = { ...state, ...patch };
  const updateNotice = document.getElementById("pwa-u");
  if (updateNotice) updateNotice.hidden = !state.updateAvailable;
  listeners.forEach((listener) => listener());
}

function isStandalone(): boolean {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return (typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches)
    || navigatorWithStandalone.standalone === true;
}

export function matchesIosDevice(userAgent: string, platform: string, maxTouchPoints: number): boolean {
  return /iPad|iPhone|iPod/i.test(userAgent)
    || (platform === "MacIntel" && maxTouchPoints > 1);
}

function isIosDevice(): boolean {
  return matchesIosDevice(navigator.userAgent, navigator.platform, navigator.maxTouchPoints);
}

function hasMeaningfulUse(): boolean {
  try {
    return Boolean(localStorage.getItem(PWA_MEANINGFUL_USE_KEY));
  } catch {
    return false;
  }
}

function refreshInstallState(): void {
  const installed = isStandalone();
  const isIos = isIosDevice();
  emit({
    installed,
    isIos,
    canInstall: !installed && hasMeaningfulUse() && (Boolean(installPrompt) || isIos),
  });
}

async function requestPersistentStorage(): Promise<void> {
  if (!navigator.storage?.persist) return;
  try {
    if (!await navigator.storage.persisted()) await navigator.storage.persist();
  } catch {
    // Storage persistence is an optional browser enhancement.
  }
}

function watchRegistration(nextRegistration: ServiceWorkerRegistration, hadController: boolean): void {
  registration = nextRegistration;
  if (nextRegistration.waiting && hadController) {
    reloadForUpdate = true;
    nextRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
    return;
  }
  watchInstallingWorker(nextRegistration, () => emit({ updateAvailable: true }));
}

export function startPwaClient(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  state = { ...serverState };
  const pwaWindow = window as PwaWindow;
  installPrompt = pwaWindow.__thinkBeeInstallPrompt ?? null;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event as InstallPromptEvent;
    pwaWindow.__thinkBeeInstallPrompt = installPrompt;
    refreshInstallState();
  });
  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    delete pwaWindow.__thinkBeeInstallPrompt;
    emit({ installed: true, canInstall: false });
    void requestPersistentStorage();
  });
  window.addEventListener(PWA_MEANINGFUL_USE_EVENT, refreshInstallState);
  document.querySelector("[data-pwa-u]")?.addEventListener("click", applyPwaUpdate);
  refreshInstallState();
  if (state.installed) void requestPersistentStorage();

  if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
  const hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloadForUpdate) window.location.reload();
  });
  void navigator.serviceWorker.register("/sw.js", { scope: "/" })
    .then((nextRegistration) => watchRegistration(nextRegistration, hadController))
    .catch(() => undefined);
}

export function subscribePwa(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPwaState(): PwaState {
  return state;
}

export function getServerPwaState(): PwaState {
  return serverState;
}

export async function promptPwaInstall(): Promise<"accepted" | "dismissed" | "unavailable" | "failed"> {
  if (!installPrompt) return "unavailable";
  const prompt = installPrompt;
  // The browser event is single-use. Consume it before awaiting to prevent
  // duplicate clicks and preserve any new event received while this one is open.
  installPrompt = null;
  delete (window as PwaWindow).__thinkBeeInstallPrompt;
  refreshInstallState();
  try {
    await prompt.prompt();
    return (await prompt.userChoice).outcome;
  } catch {
    return "failed";
  }
}

export function applyPwaUpdate(): void {
  if (!registration?.waiting) return;
  reloadForUpdate = true;
  registration.waiting.postMessage({ type: "SKIP_WAITING" });
}

if (typeof window !== "undefined") startPwaClient();
