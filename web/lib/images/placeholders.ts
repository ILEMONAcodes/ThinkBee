/** Blur placeholder data URLs for key images (tiny base64 WebP, ~20–40 bytes each). */
const placeholders: Record<string, string> = {
  "/photos/brood-comb.webp": "data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcAAEAAQU5JTQYAAAD//w==",
  "/photos/olive-foliage.webp": "data:image/webp;base64,UklGRh4AAABXRUJQVlA4TA0AAAAvAAAAEAcAAEAAQU5JTQYAAAD//w==",
  "/photos/hive-frame.webp": "data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcAAEAAQU5JTQYAAAD//w==",
  "/photos/forest-foliage.webp": "data:image/webp;base64,UklGRh4AAABXRUJQVlA4TA0AAAAvAAAAEAcAAEAAQU5JTQYAAAD//w==",
  "/photos/glossy-leaves.webp": "data:image/webp;base64,UklGRh4AAABXRUJQVlA4TA0AAAAvAAAAEAcAAEAAQU5JTQYAAAD//w==",
  "/photos/leaf-veins.webp": "data:image/webp;base64,UklGRh4AAABXRUJQVlA4TA0AAAAvAAAAEAcAAEAAQU5JTQYAAAD//w==",
  "/onboarding/welcome-beekeeper.webp": "data:image/webp;base64,UklGRh4AAABXRUJQVlA4TA0AAAAvAAAAEAcAAEAAQU5JTQYAAAD//w==",
  "/onboarding/welcome-apiary.webp": "data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcAAEAAQU5JTQYAAAD//w==",
  "/onboarding/welcome-leaf.webp": "data:image/webp;base64,UklGRh4AAABXRUJQVlA4TA0AAAAvAAAAEAcAAEAAQU5JTQYAAAD//w==",
  "/onboarding/apiary.webp": "data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcAAEAAQU5JTQYAAAD//w==",
  "/onboarding/field.webp": "data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcAAEAAQU5JTQYAAAD//w==",
  "/onboarding/hive.webp": "data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcAAEAAQU5JTQYAAAD//w==",
};

/** Get a blur data URL for an image, or a generic neutral placeholder. */
export function getPlaceholder(src: string): string {
  return placeholders[src] ?? "data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAyAQCdASoCAAIALmk0mk0iIiIiIg===";
}