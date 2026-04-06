"use client";

import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { apiFetch } from "../../lib/api-client";

type RangeKey = "7d" | "30d" | "90d" | "1y" | "all";

interface PriceHistoryPoint {
  date: string;
  minPrice: string;
  maxPrice: string;
  avgPrice: string;
  count: number;
}

interface PriceHistoryResponse {
  range: RangeKey;
  points: PriceHistoryPoint[];
}

interface Props {
  slug: string;
}

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "7d", label: "7 gün" },
  { key: "30d", label: "30 gün" },
  { key: "90d", label: "90 gün" },
  { key: "1y", label: "1 yıl" },
  { key: "all", label: "Tümü" }
];

export function PriceHistoryChart({ slug }: Props) {
  const [range, setRange] = useState<RangeKey>("90d");

  const { data, isLoading, error } = useQuery<PriceHistoryResponse>({
    queryKey: ["price-history", slug, range],
    queryFn: () =>
      apiFetch<PriceHistoryResponse>(`/products/${slug}/price-history?range=${range}`)
  });

  const handleRangeChange = (key: RangeKey) => {
    setRange(key);
  };

  const chartData =
    data?.points.map((p) => ({
      date: p.date,
      price: Number(p.minPrice)
    })) ?? [];

  return (
    <div className="card product-detail-panel-card">
      <div className="product-detail-panel-card__head">
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, margin: 0 }}>Fiyat geçmişi</h2>
        <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              className={range === opt.key ? "btn-secondary" : "btn-ghost"}
              style={{ paddingInline: "0.6rem" }}
              onClick={() => handleRangeChange(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="product-detail-panel-card__body">
        {isLoading && <p className="text-muted" style={{ fontSize: "0.9rem", margin: 0 }}>Fiyat geçmişi yükleniyor...</p>}
        {error && (
          <p className="text-danger" style={{ fontSize: "0.85rem", margin: 0 }}>
            Fiyat geçmişi yüklenirken bir hata oluştu.
          </p>
        )}
        {!isLoading && !error && chartData.length === 0 && (
          <p className="text-muted" style={{ fontSize: "0.9rem", margin: 0 }}>
            Bu ürün için henüz fiyat geçmişi yok.
          </p>
        )}
        {!isLoading && !error && chartData.length > 0 && (
          <div className="product-detail-panel-card__chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v: number) => `${v.toLocaleString("tr-TR")}`}
                />
                <Tooltip
                  formatter={(value: any) =>
                    `${Number(value).toLocaleString("tr-TR", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2
                    })} TL`
                  }
                  labelFormatter={(label) => `Tarih: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

