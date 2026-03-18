"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Genel bakış" },
  { href: "/admin/urunler", label: "Ürünler" },
  { href: "/admin/kategoriler", label: "Kategoriler" },
  { href: "/admin/markalar", label: "Markalar" },
  { href: "/admin/magazalar", label: "Mağazalar" },
  { href: "/admin/bannerlar", label: "Bannerlar" },
  { href: "/admin/feed-imports", label: "Feed importları" },
  { href: "/admin/eslesmemis", label: "Eşleşmemiş ürünler" },
  { href: "/admin/kullanicilar", label: "Kullanıcılar" },
  { href: "/admin/yorumlar", label: "Yorumlar" }
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="card" style={{ padding: "0.5rem 0", borderRadius: "0.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <nav style={{ display: "flex", flexDirection: "column", gap: "0.125rem" }}>
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="dropdown-item"
              style={{
                margin: "0 0.25rem",
                backgroundColor: active ? "#eff6ff" : "transparent",
                color: active ? "#1d4ed8" : undefined,
                fontWeight: active ? 500 : undefined
              }}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

