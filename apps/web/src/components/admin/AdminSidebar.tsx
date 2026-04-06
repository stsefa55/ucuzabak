"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const groups: { label: string; links: { href: string; label: string }[] }[] = [
  {
    label: "Genel",
    links: [{ href: "/admin", label: "Genel bakış" }]
  },
  {
    label: "Katalog",
    links: [
      { href: "/admin/urunler", label: "Ürünler" },
      { href: "/admin/kategoriler", label: "Kategoriler" },
      { href: "/admin/markalar", label: "Markalar" },
      { href: "/admin/markalar/oneriler", label: "Marka önerileri" },
      { href: "/admin/magazalar", label: "Mağazalar" },
      { href: "/admin/bannerlar", label: "Bannerlar" }
    ]
  },
  {
    label: "Feed ve import",
    links: [
      { href: "/admin/feed-imports", label: "Feed importları" },
      { href: "/admin/feed-manuel-import", label: "Manuel feed import" },
      { href: "/admin/import-operasyonlari", label: "Import operasyonları" },
      { href: "/admin/import-review", label: "Import inceleme" },
      { href: "/admin/category-overrides", label: "Kategori eşleştirme" }
    ]
  },
  {
    label: "Eşleştirme",
    links: [
      { href: "/admin/product-match-review", label: "Ürün eşleşme" },
      { href: "/admin/eslestirme-audit", label: "Eşleştirme audit" },
      { href: "/admin/eslesmemis", label: "Eşleşmemiş ürünler" }
    ]
  },
  {
    label: "Operasyon",
    links: [
      { href: "/admin/kuyruklar", label: "Kuyruklar" },
      { href: "/admin/servis-durumu", label: "Servis durumu" },
      { href: "/admin/yedekler", label: "Yedekler" }
    ]
  },
  {
    label: "İletişim",
    links: [
      { href: "/admin/eposta-gunlugu", label: "E-posta günlüğü" },
      { href: "/admin/mail", label: "Toplu e-posta" }
    ]
  },
  {
    label: "Topluluk",
    links: [
      { href: "/admin/kullanicilar", label: "Kullanıcılar" },
      { href: "/admin/yorumlar", label: "Yorumlar" }
    ]
  }
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="admin-sidebar" aria-label="Admin menüsü">
      <div className="admin-sidebar__brand">
        <p className="admin-sidebar__brand-title">Yönetim</p>
        <p className="admin-sidebar__brand-sub">Admin paneli</p>
      </div>
      <nav>
        {groups.map((group) => (
          <div key={group.label} className="admin-sidebar__group">
            <p className="admin-sidebar__group-label">{group.label}</p>
            {group.links.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`admin-sidebar__link${active ? " admin-sidebar__link--active" : ""}`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
