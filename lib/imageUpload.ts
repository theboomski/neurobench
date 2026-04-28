const ACCEPTED_INPUT_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heif",
  "image/bmp",
  "image/tiff",
  "image/x-ms-bmp",
  "image/x-tiff",
]);

export const UGC_ACCEPT_IMAGE_INPUT = ".jpg,.jpeg,.png,.gif,.webp,.avif,.heic,.heif,.bmp,.tiff";

type ImageBitmapSourceLike = {
  width: number;
  height: number;
};

function mimeAllowed(file: File) {
  return ACCEPTED_INPUT_MIME.has(file.type.toLowerCase());
}

async function decodeViaImageElement(file: File): Promise<HTMLImageElement> {
  const src = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Unsupported image: ${file.name}`));
      img.src = src;
    });
  } finally {
    URL.revokeObjectURL(src);
  }
}

async function decodeImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file);
    } catch {
      return decodeViaImageElement(file);
    }
  }
  return decodeViaImageElement(file);
}

function computeSize(width: number, height: number, maxWidth: number) {
  if (width <= maxWidth) return { width, height };
  const ratio = maxWidth / width;
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
}

export async function normalizeImageToWebp(file: File, maxWidth = 800, quality = 0.82): Promise<File> {
  if (!mimeAllowed(file)) {
    throw new Error(`Unsupported format for ${file.name}`);
  }

  const decoded = await decodeImage(file);
  const source = decoded as ImageBitmapSourceLike;
  const next = computeSize(source.width, source.height, maxWidth);

  const canvas = document.createElement("canvas");
  canvas.width = next.width;
  canvas.height = next.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process image.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(decoded as CanvasImageSource, 0, 0, next.width, next.height);
  if ("close" in decoded && typeof (decoded as ImageBitmap).close === "function") {
    (decoded as ImageBitmap).close();
  }

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
  if (!blob) throw new Error("Failed to encode image.");
  const safe = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "image";
  return new File([blob], `${safe}.webp`, { type: "image/webp", lastModified: Date.now() });
}
