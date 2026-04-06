/** NestJS JSON hata gövdesinden kullanıcı mesajı çıkarır. */
export function parseNestErrorMessage(err: unknown): string {
  const e = err as { message?: string; status?: number };
  const raw = typeof e?.message === "string" ? e.message : "";
  try {
    const body = JSON.parse(raw) as { message?: string | string[] };
    if (Array.isArray(body.message)) return String(body.message[0] ?? "İşlem başarısız.");
    if (typeof body.message === "string") return body.message;
  } catch {
    if (raw && !raw.startsWith("{")) return raw;
  }
  return "İşlem başarısız oldu. Lütfen tekrar deneyin.";
}

export function getErrorStatus(err: unknown): number | undefined {
  return (err as { status?: number })?.status;
}
