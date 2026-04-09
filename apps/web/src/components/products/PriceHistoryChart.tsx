"use client";

import { useQuery } from "@tanstack/react-query";
import React, { useState, useMemo } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { apiFetch } from "../../lib/api-client";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

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
  { key: "7d", label: "7G" },
  { key: "30d", label: "1A" },
  { key: "90d", label: "3A" },
  { key: "1y", label: "1Y" },
  { key: "all", label: "Tümü" }
];

function formatPrice(v: number): string {
  return v.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const price = Number(payload[0]?.value);
  return (
    <div className="pdp-chart-tooltip">
      <span className="pdp-chart-tooltip__date">{formatDate(label)}</span>
      <span className="pdp-chart-tooltip__price">{formatPrice(price)} TL</span>
    </div>
  );
}

export function PriceHistoryChart({ slug }: Props) {
  const [range, setRange] = useState<RangeKey>("90d");

  const { data, isLoading, error } = useQuery<PriceHistoryResponse>({
    queryKey: ["price-history", slug, range],
    queryFn: () =>
      apiFetch<PriceHistoryResponse>(`/products/${slug}/price-history?range=${range}`)
  });

  const chartData = useMemo(
    () =>
      data?.points.map((p) => ({
        date: p.date,
        price: Number(p.minPrice)
      })) ?? [],
    [data]
  );

  const stats = useMemo(() => {
    if (chartData.length === 0) return null;
    const prices = chartData.map((d) => d.price);
    const first = prices[0];
    const last = prices[prices.length - 1];
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const displayMin = Math.round(min);
    const displayMax = Math.round(max);
    const meaningful = displayMin !== displayMax;
    const diff = meaningful ? last - first : 0;
    const pct = meaningful && first > 0 ? ((diff / first) * 100) : 0;
    return { first, last, min, max, diff, pct };
  }, [chartData]);

  const trendIcon = stats
    ? stats.diff < 0
      ? <TrendingDown size={14} />
      : stats.diff > 0
        ? <TrendingUp size={14} />
        : <Minus size={14} />
    : null;

  const trendClass = stats
    ? stats.diff < 0 ? "pdp-chart-trend--down" : stats.diff > 0 ? "pdp-chart-trend--up" : "pdp-chart-trend--flat"
    : "";

  return (
    <div className="pdp-card pdp-card--stretch pdp-chart-card">
      <div className="pdp-card__head">
        <h2 className="pdp-card__heading">Fiyat geçmişi</h2>
        <div className="pdp-chart-ranges">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              className={`pdp-chart-range-btn ${range === opt.key ? "pdp-chart-range-btn--active" : ""}`}
              onClick={() => setRange(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Özet bar */}
      {stats && !isLoading && !error && (
        <div className="pdp-chart-stats">
          <div className="pdp-chart-stat">
            <span className="pdp-chart-stat__label">En düşük</span>
            <span className="pdp-chart-stat__value">{formatPrice(stats.min)} TL</span>
          </div>
          <div className="pdp-chart-stat">
            <span className="pdp-chart-stat__label">En yüksek</span>
            <span className="pdp-chart-stat__value">{formatPrice(stats.max)} TL</span>
          </div>
          <div className="pdp-chart-stat">
            <span className="pdp-chart-stat__label">Değişim</span>
            <span className={`pdp-chart-stat__value pdp-chart-trend ${trendClass}`}>
              {trendIcon}
              {stats.diff > 0 ? "+" : ""}{Math.abs(stats.pct).toFixed(1)}%
            </span>
          </div>
        </div>
      )}

      <div className="pdp-chart-body">
        {isLoading && <p className="pdp-empty">Fiyat geçmişi yükleniyor...</p>}
        {error && <p className="pdp-empty" style={{ color: "#ef4444" }}>Fiyat geçmişi yüklenirken bir hata oluştu.</p>}
        {!isLoading && !error && chartData.length === 0 && (
          <p className="pdp-empty">Bu ürün için henüz fiyat geçmişi yok.</p>
        )}
        {!isLoading && !error && chartData.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ left: -10, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#f1f5f9" strokeDasharray="none" vertical={false} />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickFormatter={formatDate}
                interval="preserveStartEnd"
                minTickGap={40}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickFormatter={(v: number) => formatPrice(v)}
                width={55}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#cbd5e1", strokeWidth: 1, strokeDasharray: "4 4" }} />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#priceGradient)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff", fill: "#3b82f6" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
