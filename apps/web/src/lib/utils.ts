export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Sayısal değeri Türk Lirası formatına çevirir: 12.550,50 TL
 * Kuruş sıfırsa sadece tam kısım gösterilir: 12.550 TL
 */
export function formatTL(value: string | number | null | undefined): string {
  if (value == null) return "Fiyat bilgisi yok";
  const num = typeof value === "number" ? value : parseFloat(String(value).replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(num)) return "Fiyat bilgisi yok";
  const hasFraction = num % 1 !== 0;
  return (
    num.toLocaleString("tr-TR", {
      minimumFractionDigits: hasFraction ? 2 : 0,
      maximumFractionDigits: 2
    }) + " TL"
  );
}

