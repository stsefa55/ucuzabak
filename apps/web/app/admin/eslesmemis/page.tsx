"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AdminPageHeader } from "../../../src/components/admin/AdminPageHeader";
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
    <div className="card admin-page">
      <AdminPageHeader
        title="Eşleşmemiş ürünler"
        description="Mağaza ürünleri ile katalog eşleşmesi bekleyen veya inceleme kuyruğundaki kayıtlar."
      />
      {isLoading && <p className="admin-loading" style={{ padding: "0.5rem 0" }}>Yükleniyor…</p>}
      {error && (
        <p className="text-danger">Eşleşmemiş ürünler yüklenirken bir hata oluştu.</p>
      )}
      {data && (
        <div className="admin-data-table-wrap">
          <table className="admin-data-table" style={{ fontSize: "0.8rem" }}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Mağaza</th>
                <th>Mağaza ürünü</th>
                <th>Önerilen ürün</th>
                <th style={{ textAlign: "right" }}>Skor</th>
                <th>Detay özeti</th>
                <th>Durum</th>
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
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{sp?.store?.name}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{sp?.title}</div>
                    <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                      {sp?.externalId}
                    </div>
                  </td>
                  <td>
                    {suggested ? (
                      <Link href={`/urun/${suggested.slug}`}>{suggested.name}</Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>{score}</td>
                  <td>{summaryParts.length > 0 ? summaryParts.join(" • ") : "—"}</td>
                  <td>{item.status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}

