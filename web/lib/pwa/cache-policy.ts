const privatePath = /^\/(?:auth|sign-in|setup|api\/v1)(?:\/|$)/;
const privateParameter = /^(?:code|error(?:_code|_description)?|access_token|refresh_token|token(?:_hash)?|signature|expires|x-amz-.+|x-goog-.+)$/i;
const imagePath = /\.(?:avif|gif|ico|jpe?g|png|svg|webp)$/i;

export function isPrivateUrl(url: URL): boolean {
  return privatePath.test(url.pathname)
    || [...url.searchParams.keys()].some((key) => privateParameter.test(key));
}

export function isPublicImage(url: URL): boolean {
  if (isPrivateUrl(url)) return false;
  if (url.pathname !== "/_next/image") return imagePath.test(url.pathname);
  const source = url.searchParams.get("url");
  if (!source) return false;
  try {
    const original = new URL(source, url.origin);
    return original.origin === url.origin && !isPrivateUrl(original) && imagePath.test(original.pathname);
  } catch {
    return false;
  }
}

export async function purgePrivatePageCaches(storage: CacheStorage): Promise<void> {
  for (const name of await storage.keys()) {
    if (!name.startsWith("thinkbee-")) continue;
    const cache = await storage.open(name);
    for (const request of await cache.keys()) {
      const url = new URL(request.url);
      if (request.headers.has("authorization") || isPrivateUrl(url)
        || (url.pathname === "/_next/image" && !isPublicImage(url))) {
        await cache.delete(request);
      }
    }
  }
}
