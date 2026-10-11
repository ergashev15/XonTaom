import { fetch } from "expo/fetch";
import { File } from "expo-file-system";
import { SUPABASE_KEY, SUPABASE_URL } from "@/api/rest";

export const MEDIA_BUCKET = "restaurant-media";
export const DOCUMENTS_BUCKET = "restaurant-documents";

const mediaTypes: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic" };

export function isRemoteUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

// Uploads an image picked on the device and returns its path inside the bucket.
// Storage policies only allow writes inside the uploader's own folder.
export async function uploadImage(bucket: string, uri: string, ownerId: string, prefix: string, accessToken: string) {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Server sozlanmagan.");
  let bytes: ArrayBuffer;
  let contentType: string;
  if (process.env.EXPO_OS === "web") {
    const blob = await (await globalThis.fetch(uri)).blob();
    bytes = await blob.arrayBuffer();
    contentType = blob.type || "image/jpeg";
  } else {
    const file = new File(uri);
    bytes = await file.arrayBuffer();
    contentType = mediaTypes[file.extension.replace(".", "").toLowerCase()] ?? "image/jpeg";
  }
  const extension = Object.keys(mediaTypes).find((key) => mediaTypes[key] === contentType) ?? "jpg";
  const path = `${ownerId}/${prefix}-${Date.now()}.${extension}`;
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}`, "Content-Type": contentType, "x-upsert": "true" },
    body: new Uint8Array(bytes)
  });
  if (!response.ok) {
    const details = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(details?.message ?? "Rasm serverga yuklanmadi.");
  }
  return path;
}

export function publicMediaUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/${path}`;
}

// Images that only exist on the device are uploaded; remote URLs are kept as they are.
export async function ensurePublicImage(uri: string, ownerId: string, prefix: string, accessToken: string) {
  if (!uri || isRemoteUrl(uri)) return uri;
  return publicMediaUrl(await uploadImage(MEDIA_BUCKET, uri, ownerId, prefix, accessToken));
}

// Private objects are served only with the viewer's token (see imageSource).
export function privateDocumentUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/authenticated/${DOCUMENTS_BUCKET}/${path}`;
}

export function imageSource(uri: string, accessToken?: string) {
  return accessToken && uri.includes("/storage/v1/object/authenticated/")
    ? { uri, headers: { Authorization: `Bearer ${accessToken}`, apikey: SUPABASE_KEY ?? "" } }
    : { uri };
}
