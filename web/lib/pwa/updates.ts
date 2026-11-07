export function watchInstallingWorker(registration: ServiceWorkerRegistration, onUpdate: () => void): void {
  const watched = new WeakSet<ServiceWorker>();
  const watch = () => {
    const worker = registration.installing;
    if (!worker || watched.has(worker)) return;
    watched.add(worker);
    const check = () => {
      if (worker.state === "installed" && navigator.serviceWorker.controller) onUpdate();
    };
    worker.addEventListener("statechange", check);
    check();
  };
  registration.addEventListener("updatefound", watch);
  watch();
}
