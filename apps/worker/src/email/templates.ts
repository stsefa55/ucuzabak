import {
  escapeAttr,
  escapeHtml,
  getBranding,
  wrapTransactionalHtml,
  wrapTransactionalText,
  type TransactionalContent
} from "./templateLayout";

const { brand } = getBranding();

export type TransactionalEmail = {
  subject: string;
  html: string;
  text: string;
};

function build(content: TransactionalContent, subject: string): TransactionalEmail {
  return {
    subject,
    html: wrapTransactionalHtml(content),
    text: wrapTransactionalText(content.mainText)
  };
}

/** Kayıt sonrası — kuyruk akışı değişmedi; içerik iyileştirildi. */
export function welcomeEmailTemplate(user: { name: string }): TransactionalEmail {
  const displayName = user.name?.trim() || "Merhaba";
  const safeName = escapeHtml(displayName);
  const mainHtml = `
<p style="margin:0 0 16px;">Merhaba ${safeName},</p>
<p style="margin:0 0 16px;">${escapeHtml(brand)} hesabınız başarıyla oluşturuldu. Artık fiyat alarmları kurabilir, favorilerinizi senkronize edebilir ve fırsatları tek yerden takip edebilirsiniz.</p>
<p style="margin:0;color:#64748b;font-size:14px;">Hesabınızla ilgili işlemleri yalnızca resmi sitemiz üzerinden yapmanızı öneririz.</p>`.trim();

  const mainText = `Merhaba ${displayName},

${brand} hesabınız başarıyla oluşturuldu. Fiyat alarmları ve favorilerle fırsatları takip edebilirsiniz.

Hesap işlemlerinizi yalnızca resmi web sitemiz üzerinden yapın.`;

  return build(
    {
      preheader: `${displayName}, hesabınız hazır.`,
      mainHtml,
      mainText
    },
    `${brand} — Hesabınız oluşturuldu`
  );
}

/** E-postadaki geçerlilik süresi (şifre sıfırlama / e-posta doğrulama). */
function formatLinkValidityTurkish(ttlSeconds: number): string {
  const totalMin = Math.max(1, Math.round(ttlSeconds / 60));
  if (totalMin < 60) {
    return `${totalMin} dakika`;
  }
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (m === 0) {
    return h === 1 ? "1 saat" : `${h} saat`;
  }
  return `${h} saat ${m} dakika`;
}

export function resetPasswordTemplate(link: string, ttlSeconds: number): TransactionalEmail {
  const href = escapeAttr(link);
  const linkText = escapeHtml(link);
  const validity = formatLinkValidityTurkish(ttlSeconds);
  const safeValidity = escapeHtml(validity);

  const mainHtml = `
<h2 style="margin:0 0 14px;font-size:18px;font-weight:600;color:#0f172a;line-height:1.35;">Şifrenizi mi unuttunuz?</h2>
<p style="margin:0 0 16px;color:#334155;line-height:1.55;">${escapeHtml(brand)} hesabınız için şifre sıfırlama talebinde bulundunuz. Aşağıdaki düğmeye tıklayarak güvenli sayfamızda <strong>yeni şifrenizi</strong> oluşturabilirsiniz.</p>
<p style="margin:0 0 22px;">
  <a href="${href}" style="display:inline-block;padding:14px 28px;background:#2563eb;color:#ffffff !important;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Yeni şifre belirle</a>
</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;width:100%;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;">
  <tr>
    <td style="padding:12px 14px;font-size:13px;line-height:1.5;color:#92400e;">
      <strong>Önemli:</strong> Bu bağlantı yalnızca <strong>${safeValidity}</strong> geçerlidir. Süre dolduğunda yeni bir talep oluşturmanız gerekir.
    </td>
  </tr>
</table>
<p style="margin:0 0 6px;color:#64748b;font-size:13px;">Düğmeye tıklayamıyorsanız aşağıdaki adresi tarayıcınıza kopyalayın:</p>
<p style="margin:0 0 20px;word-break:break-all;font-size:13px;line-height:1.45;color:#475569;">${linkText}</p>
<p style="margin:0;padding:12px 14px;background:#f1f5f9;border-radius:8px;font-size:13px;line-height:1.5;color:#475569;border:1px solid #e2e8f0;">
  <strong>Bu isteği siz yapmadıysanız</strong> bu e-postayı yok sayabilirsiniz. Mevcut şifreniz değişmez ve hesabınız güvende kalır.
</p>`.trim();

  const mainText = `ŞİFRE SIFIRLAMA — ${brand}

${brand} hesabınız için şifre sıfırlama talebi alındı.

Yeni şifrenizi belirlemek için aşağıdaki bağlantıyı tarayıcınızda açın (yalnızca ${validity} geçerlidir):

${link}

Süre dolduysa ${brand} üzerinden yeni bir "Şifremi unuttum" talebi oluşturun.

Bu isteği siz yapmadıysanız bu mesajı yok sayın. Şifreniz değişmez.`;

  return build(
    {
      preheader: `Yeni şifre için bağlantı — ${validity} geçerli.`,
      mainHtml,
      mainText
    },
    `${brand} — Şifre sıfırlama`
  );
}

export function verifyEmailTemplate(link: string, ttlSeconds: number): TransactionalEmail {
  const href = escapeAttr(link);
  const linkText = escapeHtml(link);
  const validity = formatLinkValidityTurkish(ttlSeconds);
  const safeValidity = escapeHtml(validity);

  const mainHtml = `
<h2 style="margin:0 0 14px;font-size:18px;font-weight:600;color:#0f172a;line-height:1.35;">E-postanızı doğrulayın</h2>
<p style="margin:0 0 16px;color:#334155;line-height:1.55;">${escapeHtml(brand)} hesabınız için kayıt doğrulaması gerekiyor. Aşağıdaki düğmeye tıklayarak e-posta adresinizi onaylayın.</p>
<p style="margin:0 0 22px;">
  <a href="${href}" style="display:inline-block;padding:14px 28px;background:#2563eb;color:#ffffff !important;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">E-postayı doğrula</a>
</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;width:100%;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;">
  <tr>
    <td style="padding:12px 14px;font-size:13px;line-height:1.5;color:#92400e;">
      <strong>Önemli:</strong> Bu bağlantı yalnızca <strong>${safeValidity}</strong> geçerlidir. Süre dolduğunda hesabınızdan yeni doğrulama e-postası isteyebilirsiniz.
    </td>
  </tr>
</table>
<p style="margin:0 0 6px;color:#64748b;font-size:13px;">Düğmeye tıklayamıyorsanız aşağıdaki adresi tarayıcınıza kopyalayın:</p>
<p style="margin:0 0 20px;word-break:break-all;font-size:13px;line-height:1.45;color:#475569;">${linkText}</p>
<p style="margin:0;padding:12px 14px;background:#f1f5f9;border-radius:8px;font-size:13px;line-height:1.5;color:#475569;border:1px solid #e2e8f0;">
  <strong>Bu hesabı siz oluşturmadıysanız</strong> bu e-postayı yok sayabilirsiniz.
</p>`.trim();

  const mainText = `E-POSTA DOĞRULAMA — ${brand}

${brand} hesabınız için e-posta doğrulaması gerekiyor.

Adresinizi onaylamak için aşağıdaki bağlantıyı tarayıcınızda açın (yalnızca ${validity} geçerlidir):

${link}

Süre dolduysa siteden yeni doğrulama e-postası isteyin.

Bu hesabı siz oluşturmadıysanız bu mesajı yok sayın.`;

  return build(
    {
      preheader: `E-postanızı doğrulayın — ${validity} geçerli.`,
      mainHtml,
      mainText
    },
    `${brand} — E-posta doğrulama`
  );
}

/** Hesap e-postası değişikliği — bağlantı yeni adrese gider. */
export function emailChangeVerifyTemplate(link: string, ttlSeconds: number): TransactionalEmail {
  const href = escapeAttr(link);
  const linkText = escapeHtml(link);
  const validity = formatLinkValidityTurkish(ttlSeconds);
  const safeValidity = escapeHtml(validity);

  const mainHtml = `
<h2 style="margin:0 0 14px;font-size:18px;font-weight:600;color:#0f172a;line-height:1.35;">Yeni e-posta adresinizi onaylayın</h2>
<p style="margin:0 0 16px;color:#334155;line-height:1.55;">${escapeHtml(brand)} hesabınız için e-posta değişikliği talep edildi. Bu adresi kullanmak için aşağıdaki düğmeye tıklayın.</p>
<p style="margin:0 0 22px;">
  <a href="${href}" style="display:inline-block;padding:14px 28px;background:#2563eb;color:#ffffff !important;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Adresi onayla</a>
</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;width:100%;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;">
  <tr>
    <td style="padding:12px 14px;font-size:13px;line-height:1.5;color:#92400e;">
      <strong>Önemli:</strong> Bu bağlantı yalnızca <strong>${safeValidity}</strong> geçerlidir.
    </td>
  </tr>
</table>
<p style="margin:0 0 6px;color:#64748b;font-size:13px;">Düğmeye tıklayamıyorsanız adresi tarayıcınıza kopyalayın:</p>
<p style="margin:0 0 20px;word-break:break-all;font-size:13px;line-height:1.45;color:#475569;">${linkText}</p>
<p style="margin:0;padding:12px 14px;background:#f1f5f9;border-radius:8px;font-size:13px;line-height:1.5;color:#475569;border:1px solid #e2e8f0;">
  <strong>Bu değişikliği siz talep etmediyseniz</strong> bu e-postayı yok sayın; mevcut adresiniz değişmez.
</p>`.trim();

  const mainText = `E-POSTA DEĞİŞİKLİĞİ — ${brand}

Hesabınız için yeni e-posta adresi onayı gerekiyor.

Onaylamak için (yalnızca ${validity} geçerlidir):

${link}

Bu talebi siz yapmadıysanız bu mesajı yok sayın.`;

  return build(
    {
      preheader: `Yeni e-posta adresinizi onaylayın — ${validity} geçerli.`,
      mainHtml,
      mainText
    },
    `${brand} — E-posta değişikliğini onaylayın`
  );
}

export function priceAlertTemplate(
  product: { name: string; url: string },
  price: string,
  currency: string,
  targetPrice: string
): TransactionalEmail {
  const title = escapeHtml(product.name);
  const href = escapeAttr(product.url);
  const subjProduct = product.name.length > 52 ? `${product.name.slice(0, 52)}…` : product.name;

  const mainHtml = `
<p style="margin:0 0 12px;">Belirlediğiniz hedef fiyat veya altı için izlediğiniz üründe güncelleme var.</p>
<p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#0f172a;">${title}</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;width:100%;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
  <tr>
    <td style="padding:14px 16px;font-size:14px;">
      <span style="color:#64748b;">Güncel en düşük fiyat</span><br>
      <strong style="font-size:18px;color:#0f172a;">${escapeHtml(price)} ${escapeHtml(currency)}</strong>
    </td>
  </tr>
  <tr>
    <td style="padding:0 16px 14px;font-size:13px;color:#64748b;">
      Hedefiniz: <strong style="color:#334155;">${escapeHtml(targetPrice)} ${escapeHtml(currency)}</strong>
    </td>
  </tr>
</table>
<p style="margin:0;">
  <a href="${href}" style="display:inline-block;padding:12px 22px;background:#0f172a;color:#f8fafc;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">Ürünü görüntüle</a>
</p>
<p style="margin:16px 0 0;color:#64748b;font-size:14px;">Alarmı artık istemiyorsanız hesabınızdan kapatabilirsiniz.</p>`.trim();

  const mainText = `Fiyat alarmınız tetiklendi.

Ürün: ${product.name}

Güncel en düşük fiyat: ${price} ${currency}
Hedef fiyatınız: ${targetPrice} ${currency}

Ürün sayfası:
${product.url}

Alarmı hesabınızdan kapatabilirsiniz.`;

  return build(
    {
      preheader: `${subjProduct} — hedef fiyatınıza ulaşıldı.`,
      mainHtml,
      mainText
    },
    `${brand} — Fiyat alarmı: ${subjProduct}`
  );
}

/** Yönetici SMTP / kuyruk doğrulama — gerçek bir sistem mesajı formatında. */
export function testEmailTemplate(): TransactionalEmail {
  const sentAt = new Date().toISOString();
  const mainHtml = `
<p style="margin:0 0 12px;">Bu mesaj, <strong>${escapeHtml(brand)}</strong> e-posta altyapınızın başarıyla çalıştığını doğrulamak için gönderilmiştir.</p>
<p style="margin:0 0 12px;color:#64748b;font-size:14px;">Gönderim zamanı (UTC): <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:13px;">${escapeHtml(sentAt)}</code></p>
<p style="margin:0;color:#64748b;font-size:14px;">Bu e-postayı siz tetiklemediyseniz güvenlik ekibinize bildirin; üretim ortamında yalnızca yetkili yöneticiler test gönderimi başlatmalıdır.</p>`.trim();

  const mainText = `E-posta altyapısı doğrulama

Bu mesaj, ${brand} e-posta sisteminin çalıştığını doğrulamak için gönderilmiştir.

Gönderim zamanı (UTC): ${sentAt}

Bu testi siz başlatmadıysanız güvenlik ekibinize bildirin.`;

  return build(
    {
      preheader: "E-posta teslimi doğrulandı.",
      mainHtml,
      mainText
    },
    `${brand} — E-posta teslimi doğrulandı`
  );
}
