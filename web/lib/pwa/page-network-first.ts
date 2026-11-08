import { Strategy, type StrategyHandler, type StrategyOptions } from "serwist";

/** A deadline also applies when there is no cached page, including navigation preload. */
export class PageNetworkFirst extends Strategy {
  private readonly timeoutMs: number;

  constructor(options: StrategyOptions & { networkTimeoutSeconds: number }) {
    super(options);
    this.timeoutMs = options.networkTimeoutSeconds * 1000;
  }

  protected async _handle(request: Request, handler: StrategyHandler): Promise<Response> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new Error("page_network_timeout"));
      }, this.timeoutMs);
    });
    try {
      // Serwist can use browser navigation preload here. Race that promise too;
      // aborting the request alone cannot cancel a browser-owned preload.
      const response = await Promise.race([
        handler.fetch(new Request(request, { signal: controller.signal })),
        deadline,
      ]);
      if (response.status >= 500) throw new Error("page_server_unavailable");
      if (response.status === 200) void handler.waitUntil(handler.cachePut(request, response.clone()));
      return response;
    } catch (error) {
      const cached = await handler.cacheMatch(request);
      if (cached) return cached;
      // Serwist's precached fallback handles navigations; RSC requests fail so
      // Next.js can recover with a full navigation instead of receiving HTML as RSC.
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}
