"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getApiBaseUrl } from "../../src/lib/api-client";
import { fetchJsonOrNull } from "../../src/lib/server-api-fetch";
import { Header } from "../../src/components/layout/Header";
import { useCompareStore, type CompareProduct } from "../../src/stores/compare-store";
import { formatTL } from "../../src/lib/utils";

type CompareRow = CompareProduct & { _fetchError?: boolean };

function toCompareRow(data: Record<string, unknown>): CompareProduct {
  return {
    id: data.id as number,
    name: (data.name as string) ?? "",
    slug: (data.slug as string) ?? "",
    lowestPriceCache: data.lowestPriceCache != null ? String(data.lowestPriceCache) : null,
    offerCountCache: typeof data.offerCountCache === "number" ? data.offerCountCache : 0,
    brand: data.brand as CompareProduct["brand"],
    category: data.category as CompareProduct["category"],
    ean: data.ean as string | null,
    modelNumber: data.modelNumber as string | null,
    specsJson: data.specsJson as Record<string, unknown> | null
  };
}

export default function ComparePage() {
  const compareProducts = useCompareStore((s) => s.compareProducts);
  const clearCompare = useCompareStore((s) => s.clearCompare);
  const removeProduct = useCompareStore((s) => s.removeProduct);
  const [freshProducts, setFreshProducts] = useState<CompareRow[] | null>(null);

  useEffect(() => {
    if (compareProducts.length === 0) {
      setFreshProducts(null);
      return;
    }
    let cancelled = false;
    Promise.all(
      compareProducts.map(async (p): Promise<CompareRow> => {
        try {
          const data = await fetchJsonOrNull<Record<string, unknown>>(`${getApiBaseUrl()}/products/${p.slug}`);
          if (!data) return { ...p, _fetchError: true };
          return toCompareRow(data);
        } catch {
          return { ...p, _fetchError: true };
        }
      })
    ).then((results) => {
      if (!cancelled) setFreshProducts(results);
    });
    return () => {
      cancelled = true;
    };
  }, [compareProducts]);

  const displayProducts: CompareRow[] =
    freshProducts != null && freshProducts.length === compareProducts.length
      ? freshProducts
      : compareProducts.map((p) => ({ ...p }));

  return (
    <>
      <Header />
      <main className="main">
        <div className="container">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              marginBottom: "1rem"
            }}
          >
            <h1 style={{ fontSize: "1.4rem", fontWeight: 600 }}>Ürün karşılaştırma</h1>
            {displayProducts.length > 0 && (
              <button
                type="button"
                className="btn-ghost"
                style={{ fontSize: "0.8rem" }}
                onClick={clearCompare}
              >
                Temizle
              </button>
            )}
          </div>
          {displayProducts.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "2.5rem 1.5rem" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>⚖️</div>
              <p style={{ fontSize: "1rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>
                Karşılaştırma listeniz boş
              </p>
              <p className="text-muted" style={{ fontSize: "0.88rem", maxWidth: 420, margin: "0 auto 1rem" }}>
                Ürün kartlarındaki karşılaştır butonuna tıklayarak ürünleri buraya ekleyebilirsiniz. En fazla 4 ürünü yan yana karşılaştırabilirsiniz.
              </p>
              <Link href="/" className="btn-primary" style={{ display: "inline-flex", padding: "0.5rem 1.25rem", fontSize: "0.88rem" }}>
                Ürünlere göz at
              </Link>
            </div>
          ) : (
            <div
              className="card"
              style={{
                overflowX: "auto",
                WebkitOverflowScrolling: "touch"
              }}
            >
              <table
                style={{
                  width: "100%",
                  minWidth: 600,
                  borderCollapse: "collapse",
                  fontSize: "0.85rem"
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        position: "sticky",
                        left: 0,
                        zIndex: 1,
                        backgroundColor: "#ffffff",
                        padding: "0.6rem",
                        textAlign: "left",
                        fontWeight: 600,
                        borderBottom: "1px solid #e5e7eb",
                        minWidth: 140
                      }}
                    />
                    {displayProducts.map((p) => (
                      <th
                        key={p.id}
                        style={{
                          padding: "0.6rem",
                          textAlign: "left",
                          borderBottom: "1px solid #e5e7eb"
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 600,
                            marginBottom: 4,
                            fontSize: "0.9rem"
                          }}
                        >
                          {p.name}
                        </div>
                        <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                          {p.brand?.name ?? ""} {p.category?.name ? `• ${p.category.name}` : ""}
                          {p._fetchError && (
                            <span style={{ display: "block", marginTop: 4, color: "#b91c1c" }}>
                              Ürün artık mevcut değil
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ fontSize: "0.7rem", marginTop: 4 }}
                          onClick={() => removeProduct(p.id)}
                        >
                          Kaldır
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td
                      style={{
                        padding: "0.5rem",
                        fontWeight: 600,
                        position: "sticky",
                        left: 0,
                        backgroundColor: "#ffffff",
                        borderBottom: "1px solid #f3f4f6"
                      }}
                    >
                      Marka
                    </td>
                    {displayProducts.map((p) => (
                      <td key={p.id} style={{ padding: "0.5rem", borderBottom: "1px solid #f3f4f6" }}>
                        {p.brand?.name ?? "-"}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td
                      style={{
                        padding: "0.5rem",
                        fontWeight: 600,
                        position: "sticky",
                        left: 0,
                        backgroundColor: "#ffffff",
                        borderBottom: "1px solid #f3f4f6"
                      }}
                    >
                      Kategori
                    </td>
                    {displayProducts.map((p) => (
                      <td key={p.id} style={{ padding: "0.5rem", borderBottom: "1px solid #f3f4f6" }}>
                        {p.category?.name ?? "-"}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td
                      style={{
                        padding: "0.5rem",
                        fontWeight: 600,
                        position: "sticky",
                        left: 0,
                        backgroundColor: "#ffffff",
                        borderBottom: "1px solid #f3f4f6"
                      }}
                    >
                      En düşük fiyat
                    </td>
                    {displayProducts.map((p) => (
                      <td key={p.id} style={{ padding: "0.5rem", borderBottom: "1px solid #f3f4f6" }}>
                        {p._fetchError ? (
                          <span className="text-muted" style={{ fontSize: "0.8rem" }}>
                            Ürün artık mevcut değil
                          </span>
                        ) : p.lowestPriceCache ? (
                          formatTL(p.lowestPriceCache)
                        ) : (
                          "-"
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td
                      style={{
                        padding: "0.5rem",
                        fontWeight: 600,
                        position: "sticky",
                        left: 0,
                        backgroundColor: "#ffffff",
                        borderBottom: "1px solid #f3f4f6"
                      }}
                    >
                      Teklif sayısı
                    </td>
                    {displayProducts.map((p) => (
                      <td key={p.id} style={{ padding: "0.5rem", borderBottom: "1px solid #f3f4f6" }}>
                        {p._fetchError ? "—" : (p.offerCountCache ?? 0)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td
                      style={{
                        padding: "0.5rem",
                        fontWeight: 600,
                        position: "sticky",
                        left: 0,
                        backgroundColor: "#ffffff",
                        borderBottom: "1px solid #f3f4f6"
                      }}
                    >
                      EAN
                    </td>
                    {displayProducts.map((p) => (
                      <td key={p.id} style={{ padding: "0.5rem", borderBottom: "1px solid #f3f4f6" }}>
                        {p.ean ?? "-"}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td
                      style={{
                        padding: "0.5rem",
                        fontWeight: 600,
                        position: "sticky",
                        left: 0,
                        backgroundColor: "#ffffff",
                        borderBottom: "1px solid #f3f4f6"
                      }}
                    >
                      Model numarası
                    </td>
                    {displayProducts.map((p) => (
                      <td key={p.id} style={{ padding: "0.5rem", borderBottom: "1px solid #f3f4f6" }}>
                        {p.modelNumber ?? "-"}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td
                      style={{
                        padding: "0.5rem",
                        fontWeight: 600,
                        position: "sticky",
                        left: 0,
                        backgroundColor: "#ffffff"
                      }}
                    >
                      Özellikler
                    </td>
                    {displayProducts.map((p) => {
                      const specs = p.specsJson && typeof p.specsJson === "object" ? p.specsJson : null;
                      const entries = specs ? Object.entries(specs).slice(0, 6) : [];
                      return (
                        <td key={p.id} style={{ padding: "0.5rem", verticalAlign: "top" }}>
                          {entries.length === 0 ? (
                            <span className="text-muted" style={{ fontSize: "0.78rem" }}>
                              Özellik bilgisi yok
                            </span>
                          ) : (
                            <dl
                              style={{
                                margin: 0,
                                display: "grid",
                                gridTemplateColumns: "auto 1fr",
                                columnGap: 8,
                                rowGap: 2,
                                fontSize: "0.78rem"
                              }}
                            >
                              {entries.map(([key, value]) => (
                                <React.Fragment key={`${p.id}-${key}`}>
                                  <dt className="text-muted">
                                    {key}:
                                  </dt>
                                  <dd
                                    style={{ margin: 0, overflow: "hidden", textOverflow: "ellipsis" }}
                                  >
                                    {String(value)}
                                  </dd>
                                </React.Fragment>
                              ))}
                            </dl>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

