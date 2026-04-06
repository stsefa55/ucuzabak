import { resolveStorefrontBaseUrlForWeb } from "@ucuzabak/shared";
import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = resolveStorefrontBaseUrlForWeb();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/"
      },
      {
        userAgent: "Amazonbot",
        disallow: "/"
      },
      {
        userAgent: "Applebot-Extended",
        disallow: "/"
      },
      {
        userAgent: "Bytespider",
        disallow: "/"
      },
      {
        userAgent: "CCBot",
        disallow: "/"
      },
      {
        userAgent: "ClaudeBot",
        disallow: "/"
      },
      {
        userAgent: "Google-Extended",
        disallow: "/"
      },
      {
        userAgent: "GPTBot",
        disallow: "/"
      },
      {
        userAgent: "meta-externalagent",
        disallow: "/"
      }
    ],
    sitemap: `${base}/sitemap.xml`
  };
}
