"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../lib/api-client";
import { useAuthStore } from "../../stores/auth-store";

interface Props {
  productId: number;
}

export function ProductPriceAlertSection({ productId }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { accessToken } = useAuthStore();
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
    onError: (err: any) => {
      setError(err?.message || "Fiyat alarmı kaydedilirken bir hata oluştu.");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!accessToken) {
      router.push("/giris");
      return;
    }
    createMutation.mutate();
  };

  return (
    <div>
      <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>Fiyat alarmı</h3>
      {existingAlert && (
        <p className="text-muted" style={{ fontSize: "0.85rem", marginBottom: "0.5rem" }}>
          Bu ürün için kayıtlı bir fiyat alarmınız var. Hedef fiyat: {existingAlert.targetPrice} TL
        </p>
      )}
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
        <input
          type="number"
          min={0}
          step={0.01}
          className="input"
          placeholder="Hedef fiyat (TL)"
          value={targetPrice}
          onChange={(e) => setTargetPrice(e.target.value)}
        />
        <button type="submit" className="btn-secondary" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Kaydediliyor..." : "Alarm oluştur"}
        </button>
      </form>
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

