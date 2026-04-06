"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { apiFetch } from "../../lib/api-client";
import { getErrorStatus, parseNestErrorMessage } from "../../lib/nest-error";
import { useAuthStore } from "../../stores/auth-store";

interface Props {
  productId: number;
  /** Ürün kartı sağ üst: küçük form */
  compact?: boolean;
}

export function ProductPriceAlertSection({ productId, compact = false }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { accessToken, user } = useAuthStore();
  const needsEmailVerification = !!accessToken && user?.emailVerified === false;
  const [targetPrice, setTargetPrice] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const alertsQuery = useQuery({
    queryKey: ["price-alerts"],
    enabled: !!accessToken,
    queryFn: async () => {
      if (!accessToken) throw new Error("UNAUTHENTICATED");
      return apiFetch<any[]>("/me/price-alerts", { accessToken });
    }
  });

  const existingAlert = alertsQuery.data?.find((a) => a.productId === productId);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!accessToken) throw new Error("UNAUTHENTICATED");
      const priceNumber = Number(targetPrice);
      if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
        throw new Error("Lütfen geçerli bir hedef fiyat girin.");
      }
      return apiFetch("/me/price-alerts", {
        method: "POST",
        body: { productId, targetPrice: priceNumber },
        accessToken
      });
    },
    onSuccess: () => {
      setTargetPrice("");
      queryClient.invalidateQueries({ queryKey: ["price-alerts"] });
    },
    onError: (err: unknown) => {
      if (getErrorStatus(err) === 403) {
        setError(parseNestErrorMessage(err));
        return;
      }
      setError((err as { message?: string })?.message || "Fiyat alarmı kaydedilirken bir hata oluştu.");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!accessToken) {
      router.push("/giris");
      return;
    }
    if (needsEmailVerification) {
      router.push("/profil");
      return;
    }
    createMutation.mutate();
  };

  if (compact) {
    return (
      <div className="product-detail-hero__alert-inline">
        <div className="product-detail-hero__alert-inline-head">
          <span className="product-detail-hero__alert-inline-label">
            <Bell size={15} strokeWidth={2} aria-hidden />
            Fiyat alarmı
          </span>
          {existingAlert ? (
            <span className="product-detail-hero__alert-pill">Hedef {existingAlert.targetPrice} TL</span>
          ) : null}
        </div>
        {accessToken && needsEmailVerification ? (
          <p className="product-detail-hero__alert-guest text-muted">
            Fiyat alarmı için önce{" "}
            <Link href="/profil" className="product-detail-hero__alert-link">
              e-postanızı doğrulayın
            </Link>
            .
          </p>
        ) : accessToken ? (
          <form className="product-detail-hero__alert-form" onSubmit={handleSubmit}>
            <input
              type="number"
              min={0}
              step={0.01}
              className="input product-detail-hero__alert-input product-detail-hero__alert-number"
              placeholder="Hedef fiyat"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              aria-label="Hedef fiyat (TL)"
            />
            <button type="submit" className="btn-primary product-detail-hero__alert-submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "…" : "Kur"}
            </button>
          </form>
        ) : (
          <p className="product-detail-hero__alert-guest text-muted">
            Alarm kurmak için{" "}
            <Link href="/giris" className="product-detail-hero__alert-link">
              giriş yapın
            </Link>
            .
          </p>
        )}
        {error ? <p className="text-danger product-detail-hero__alert-err">{error}</p> : null}
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>Fiyat alarmı</h3>
      {existingAlert && (
        <p className="text-muted" style={{ fontSize: "0.85rem", marginBottom: "0.5rem" }}>
          Bu ürün için kayıtlı bir fiyat alarmınız var. Hedef fiyat: {existingAlert.targetPrice} TL
        </p>
      )}
      {accessToken && needsEmailVerification ? (
        <p className="text-muted" style={{ fontSize: "0.85rem", marginBottom: "0.5rem" }}>
          Fiyat alarmı için önce{" "}
          <Link href="/profil">e-postanızı doğrulayın</Link>.
        </p>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <input
            type="number"
            min={0}
            step={0.01}
            className="input product-detail-hero__alert-number"
            placeholder="Hedef fiyat (TL)"
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
          />
          <button type="submit" className="btn-secondary" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Kaydediliyor..." : "Alarm oluştur"}
          </button>
        </form>
      )}
      {error && (
        <p className="text-danger" style={{ fontSize: "0.85rem" }}>
          {error}
        </p>
      )}
      {!accessToken && (
        <p className="text-muted" style={{ fontSize: "0.8rem" }}>
          Fiyat alarmı oluşturmak için giriş yapmanız gerekir.
        </p>
      )}
    </div>
  );
}

