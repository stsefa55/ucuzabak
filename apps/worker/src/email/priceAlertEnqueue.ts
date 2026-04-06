import type { PriceAlertEmailJobData } from "@ucuzabak/shared";
import { Prisma, ProductStatus } from "@prisma/client";
import { prisma } from "../prisma";
import { getEmailQueue } from "./emailQueue";

/**
 * Ürünün önbellekteki en düşük fiyatı güncellendikten sonra aktif alarmları kontrol eder.
 * Hedef: güncel fiyat ≤ kullanıcı hedefi (targetPrice); tekrarlı bildirimleri lastNotifiedPrice ile sınırlar.
 */
export async function enqueuePriceAlertsForProduct(productId: number, lowestPriceStr: string): Promise<void> {
  let lowest: Prisma.Decimal;
  try {
    lowest = new Prisma.Decimal(lowestPriceStr);
  } catch {
    return;
  }
  const lowNum = Number(lowest);
  if (!Number.isFinite(lowNum) || lowNum <= 0) {
    return;
  }

  /**
   * En düşük fiyat hedefin ÜZERİNE çıktıysa (targetPrice < lowest), bir sonraki düşüşte tekrar
   * bildirim gidebilsin diye lastNotifiedPrice sıfırlanır. Aksi halde eski lastNotifiedPrice
   * (ör. 100 TL) yeni fiyatla (ör. 140 TL) karşılaştırılıp yanlışlıkla "zaten bildirildi" denirdi.
   */
  await prisma.priceAlert.updateMany({
    where: {
      productId,
      isActive: true,
      targetPrice: { lt: lowest }
    },
    data: { lastNotifiedPrice: null }
  });

  const alerts = await prisma.priceAlert.findMany({
    where: {
      productId,
      isActive: true,
      targetPrice: { gte: lowest },
      user: { emailVerified: true }
    },
    include: {
      user: { select: { email: true } },
      product: { select: { name: true, slug: true, status: true } }
    }
  });

  if (alerts.length === 0) {
    return;
  }

  const queue = getEmailQueue();

  for (const alert of alerts) {
    if (alert.product.status !== ProductStatus.ACTIVE) {
      continue;
    }

    const lastN = alert.lastNotifiedPrice != null ? Number(alert.lastNotifiedPrice) : null;
    if (lastN != null && lowNum >= lastN - 0.004) {
      continue;
    }

    const payload: PriceAlertEmailJobData = {
      to: alert.user.email,
      productName: alert.product.name,
      productSlug: alert.product.slug,
      price: lowestPriceStr,
      currency: alert.currency,
      targetPrice: String(alert.targetPrice)
    };

    await queue.add("price_alert", payload);
    await prisma.priceAlert.update({
      where: { id: alert.id },
      data: {
        lastTriggeredAt: new Date(),
        lastNotifiedPrice: lowest
      }
    });
  }
}
