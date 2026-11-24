import { apiRequest, type ApiSchema } from "@/lib/api/client";

export async function uploadScanPhoto(file: File, owner: string): Promise<string> {
  const image = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  try {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image compression unavailable");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
  } finally {
    image.close();
  }
  const photo = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Image compression failed")), "image/webp", 0.85);
  });
  const { key } = await apiRequest<ApiSchema["ScanPhotoResponse"]>("/scans/photos", owner, "POST", photo);
  return key;
}
