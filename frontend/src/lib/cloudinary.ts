const CLOUD  = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
const PRESET = import.meta.env.VITE_CLOUDINARY_PRESET     as string | undefined;

export async function uploadImage(file: File, folder = "rezerwo"): Promise<string> {
  if (!CLOUD || !PRESET) throw new Error("Cloudinary nie jest skonfigurowany (brak env vars)");
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", PRESET);
  fd.append("folder", folder);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err?.error?.message || `Błąd przesyłania (${res.status})`);
  }
  const data = await res.json() as { secure_url: string };
  return data.secure_url;
}
