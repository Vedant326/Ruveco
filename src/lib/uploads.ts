import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { ALLOWED_FILE_TYPES, MAX_FILE_BYTES } from "./constants";
import { fb } from "./firebase/client";

/** Returns an error message, or null when the file is allowed. */
export function validateFile(file: Blob, imagesOnly = false) {
  const allowed = imagesOnly ? ALLOWED_FILE_TYPES.filter((t) => t.startsWith("image/")) : ALLOWED_FILE_TYPES;
  if (!allowed.includes(file.type)) return imagesOnly ? "Use a JPG or PNG image" : "Use a PDF, JPG or PNG file";
  if (file.size > MAX_FILE_BYTES) return "File is larger than 10 MB";
  return null;
}

export function safeFileName(name: string) {
  return name.replace(/[^\w.-]+/g, "_").slice(-80);
}

export async function uploadFile(path: string, file: Blob) {
  await uploadBytes(ref(fb().storage, path), file, { contentType: file.type });
}

/** Opens a stored file in a new tab. Storage rules decide who may read it. */
export async function openFile(path: string) {
  const url = await getDownloadURL(ref(fb().storage, path));
  window.open(url, "_blank", "noopener");
}

/**
 * Saves the record of a file that is already uploaded, trying up to 3 times. Only this step
 * repeats (the upload is not sent again), and the server ignores a file it already recorded.
 * Answers that will not change on a retry (signed out, no access, not found, limit reached) stop at once.
 */
export async function saveWithRetry<T>(save: () => Promise<T>, attempts = 3): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await save();
    } catch (err) {
      const status = (err as { status?: number }).status ?? 0;
      if (attempt >= attempts || [401, 403, 404, 409].includes(status)) throw err;
      await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
    }
  }
}
