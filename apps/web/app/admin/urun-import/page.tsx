"use client";

import { useState } from "react";
import { Header } from "../../../src/components/layout/Header";
import { apiFetch } from "../../../src/lib/api-client";
import { useAuthStore } from "../../../src/stores/auth-store";

interface ImportResult {
  createdCount: number;
  skippedCount: number;
  failedCount: number;
  errors: { row: number; message: string }[];
}

export default function AdminProductImportPage() {
  const { accessToken } = useAuthStore();
  const [csv, setCsv] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!accessToken) return null;

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    setIsImporting(true);
    setError(null);
    setResult(null);
    try {
      const res = await apiFetch<ImportResult>("/admin/products/import-csv", {
        method: "POST",
        body: { csv },
        accessToken
      });
      setResult(res);
    } catch (err) {
      const message = err instanceof Error ? err.message : "İçeri aktarma sırasında bir hata oluştu.";
      try {
        const parsed = JSON.parse(message);
        setError(parsed.message ?? message);
      } catch {
        setError(message);
      }
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <>
      <Header />
      <main className="main">
        <div className="container">
          <div className="card admin-page" style={{ maxWidth: 840, margin: "0 auto" }}>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.75rem" }}>
              CSV ile ürün içeri aktarma
            </h1>
            <p className="text-muted" style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>
              Aşağıdaki kolonları içeren bir CSV metnini yapıştırın:{" "}
              <code>name, slug, brand, category, ean, modelNumber, mainImageUrl, description, specsJson</code>.
            </p>
            <form onSubmit={handleImport} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <textarea
                className="form-control"
                rows={10}
                placeholder={`name,slug,brand,category,ean,modelNumber,mainImageUrl,description,specsJson
Telefon X,test-telefon-x,Samsung,Telefonlar,1234567890123,SM-X,https://...,"Açıklama","{\\"ekran_boyutu\\":\\"6.5 inç\\"}"`}
                value={csv}
                onChange={(e) => setCsv(e.target.value)}
              />
              <button type="submit" className="btn-primary" disabled={isImporting || !csv.trim()}>
                {isImporting ? "İçeri aktarılıyor..." : "CSV'yi içeri aktar"}
              </button>
              {error && (
                <p className="text-danger" style={{ marginTop: "0.25rem" }}>
                  {error}
                </p>
              )}
            </form>

            {result && (
              <div style={{ marginTop: "1rem" }}>
                <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>Özet</h2>
                <p style={{ fontSize: "0.9rem" }}>
                  Oluşturulan: <strong>{result.createdCount}</strong> • Atlanan:{" "}
                  <strong>{result.skippedCount}</strong> • Hatalı: <strong>{result.failedCount}</strong>
                </p>
                {Array.isArray(result.errors) && result.errors.length > 0 && (
                  <div style={{ marginTop: "0.5rem" }}>
                    <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.25rem" }}>
                      Satır bazlı hatalar
                    </h3>
                    <ul style={{ fontSize: "0.85rem", paddingLeft: "1.1rem" }}>
                      {result.errors.map((err, idx) => (
                        <li key={`${err.row}-${idx}`}>
                          Satır {err.row}: {err.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

