/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";

import { watchInstallingWorker } from "@/lib/pwa/updates";

afterEach(() => vi.unstubAllGlobals());

function fixture(controlled = true) {
  vi.stubGlobal("navigator", { serviceWorker: { controller: controlled ? {} : null } });
  const worker = Object.assign(new EventTarget(), { state: "installing" });
  const registration = Object.assign(new EventTarget(), { installing: worker as typeof worker | null });
  const notify = vi.fn();
  // Only the lifecycle surface used by the browser watcher is simulated.
  const watch = () => watchInstallingWorker(registration as unknown as ServiceWorkerRegistration, notify);
  const installed = () => { worker.state = "installed"; worker.dispatchEvent(new Event("statechange")); };
  return { worker, registration, notify, watch, installed };
}

describe("worker update lifecycle", () => {
  it("notifies when a worker was already installing before registration resolved", () => {
    const f = fixture();
    f.watch();
    f.installed();
    expect(f.notify).toHaveBeenCalledOnce();
  });

  it("watches later updates without subscribing to a worker twice", () => {
    const f = fixture();
    f.registration.installing = null;
    f.watch();
    f.registration.installing = f.worker;
    f.registration.dispatchEvent(new Event("updatefound"));
    f.registration.dispatchEvent(new Event("updatefound"));
    f.installed();
    expect(f.notify).toHaveBeenCalledOnce();
  });

  it("does not call the first installation an update", () => {
    const f = fixture(false);
    f.watch();
    f.installed();
    expect(f.notify).not.toHaveBeenCalled();
  });
});
