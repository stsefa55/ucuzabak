/**
 * Ortak transactional e-posta iskeleti: marka, footer, HTML + düz metin.
 */

import { resolveStorefrontBaseUrlForBackend } from "@ucuzabak/shared";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

const BRAND_DISPLAY = "UcuzaBak";

export function getBranding() {
  const siteUrl = resolveStorefrontBaseUrlForBackend();
  let siteHost = "ucuzabak.com";
  try {
    siteHost = new URL(siteUrl).hostname.replace(/^www\./i, "") || siteHost;
  } catch {
    /* keep default */
  }
  const year = new Date().getFullYear();
  return { brand: BRAND_DISPLAY, siteUrl, siteHost, year };
}

export type TransactionalContent = {
  /** Gelen kutusu önizlemesi (kısa, içerikle uyumlu; spam tetikleyici doldurma yapmayın) */
  preheader: string;
  /** Ana HTML parçaları (içeride <p>, <a> vb. — kaçış çağıran taraf yapar) */
  mainHtml: string;
  /** Düz metin gövde (footer hariç; wrap ekler) */
  mainText: string;
};

/**
 * Profesyonel transactional HTML: tablo düzeni, preheader, üst marka şeridi, alt bilgi.
 */
export function wrapTransactionalHtml(content: TransactionalContent): string {
  const { preheader, mainHtml } = content;
  const { brand, siteUrl, siteHost, year } = getBranding();
  const footerHtml = `
<p style="margin:0 0 8px;color:#475569;font-size:13px;">
  © ${year} ${escapeHtml(brand)} · <a href="${escapeAttr(siteUrl)}" style="color:#2563eb;text-decoration:none;">${escapeHtml(siteHost)}</a>
</p>
<p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.5;">
  Bu e-posta ${escapeHtml(brand)} hesabınız veya talebinizle ilgili otomatik olarak gönderilmiştir.
  Güvenliğiniz için bağlantıları yalnızca güvendiğiniz cihazlardan açın.
</p>
<p style="margin:12px 0 0;color:#94a3b8;font-size:12px;">
  Bu mesajı yanıtlamanız gerekmez. Destek için web sitemizdeki iletişim kanallarını kullanabilirsiniz.
</p>`.trim();

  const safePre = escapeHtml(preheader);

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="x-ua-compatible" content="ie=edge">
<title>${escapeHtml(brand)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;">
<span style="display:none!important;visibility:hidden;mso-hide:all;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${safePre}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:28px 14px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:10px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.06);">
        <tr>
          <td style="padding:18px 24px;background:#0f172a;border-bottom:1px solid #1e293b;">
            <span style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:18px;font-weight:600;color:#f8fafc;letter-spacing:-0.02em;">${escapeHtml(brand)}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:26px 24px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.55;color:#334155;">
            ${mainHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:18px 24px 22px;background:#f8fafc;border-top:1px solid #e2e8f0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
            ${footerHtml}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

export function wrapTransactionalText(mainText: string): string {
  const { brand, siteUrl, siteHost, year } = getBranding();
  const footer = `
—
© ${year} ${brand}
Web: ${siteUrl} (${siteHost})

Bu e-posta ${brand} hesabınız veya talebinizle ilgili otomatik olarak gönderilmiştir.
Bu mesajı yanıtlamanız gerekmez.`.trim();

  return `${mainText.trim()}\n\n${footer}`;
}
