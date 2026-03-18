"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { apiFetch } from "../../../src/lib/api-client";
import { useAuthStore } from "../../../src/stores/auth-store";

interface UnmatchedResponse {
  items: any[];
  total: number;
  page: number;
  pageSize: number;
}

export default function AdminUnmatchedPage() {
  const { accessToken } = useAuthStore();

  const { data, isLoading, error } = useQuery<UnmatchedResponse>({
    queryKey: ["admin-unmatched"],
    queryFn: () =>
      apiFetch<UnmatchedResponse>("/admin/unmatched-reviews?page=1&pageSize=50", {
        accessToken
      }),
    enabled: !!accessToken
  });

  if (!accessToken) return null;

  return (
    <div className="card">
      <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.75rem" }}>
        Eşleşmemiş ürünler
      </h2>
      {isLoading && <p>Yükleniyor...</p>}
      {error && (
        <p className="text-danger">Eşleşmemiş ürünler yüklenirken bir hata oluştu.</p>
      )}
      {data && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>ID</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Mağaza</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Mağaza ürünü</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Önerilen ürün</th>
              <th style={{ textAlign: "right", padding: "0.5rem" }}>Skor</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Detay özeti</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Durum</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => {
              const sp = item.storeProduct;
              const suggested = item.suggestedProduct;
              const score = sp?.matchScore ?? 0;
              const details = sp?.matchDetailsJson || {};
              const titleScore = details?.components?.title?.score ?? 0;
              const eanMatched = details?.components?.ean?.matched ? "EAN" : "";
              const modelMatched = details?.components?.model?.matched ? "Model" : "";
              const specCount = (details?.components?.specs?.matchedFields || []).length;

              const summaryParts: string[] = [];
              if (eanMatched) summaryParts.push(eanMatched);
              if (modelMatched) summaryParts.push(modelMatched);
              if (titleScore) summaryParts.push(`Başlık skor: ${titleScore}`);
              if (specCount) summaryParts.push(`Spec eşleşme: ${specCount}`);

              return (
                <tr key={item.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "0.5rem" }}>{item.id}</td>
                  <td style={{ padding: "0.5rem" }}>{sp?.store?.name}</td>
                  <td style={{ padding: "0.5rem" }}>
                    <div style={{ fontWeight: 500 }}>{sp?.title}</div>
                    <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                      {sp?.externalId}
                    </div>
                  </td>
                  <td style={{ padding: "0.5rem" }}>
                    {suggested ? (
                      <Link href={`/urun/${suggested.slug}`}>{suggested.name}</Link>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td style={{ padding: "0.5rem", textAlign: "right" }}>{score}</td>
                  <td style={{ padding: "0.5rem" }}>
                    {summaryParts.length > 0 ? summaryParts.join(" • ") : "-"}
                  </td>
                  <td style={{ padding: "0.5rem" }}>{item.status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

