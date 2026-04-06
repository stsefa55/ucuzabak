"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Heart, LogIn, LogOut, Search, Shield, User, UserPlus, Bell } from "lucide-react";
import { useAuthStore } from "../../stores/auth-store";
import { apiFetch } from "../../lib/api-client";
import { Dropdown, DropdownItem } from "../ui/dropdown";
import { CategoriesMenu } from "./CategoriesMenu";
import { HeaderSearch } from "./HeaderSearch";
import { cn } from "../../lib/utils";

function HeaderFallback() {
  const [logoError, setLogoError] = useState(false);
  return (
    <header className="header">
      <div className="container header-inner" style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <Link href="/" className="header-logo" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            {logoError ? (
              <>
                <span style={{ width: 32, height: 32, borderRadius: "999px", background: "linear-gradient(135deg, #2563eb, #22c55e)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "0.9rem" }}>U</span>
                <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>UcuzaBak</span>
              </>
            ) : (
              <Image
                src="/logo.png"
                alt="UcuzaBak.com - İndirimleri Yakala"
                width={200}
                height={52}
                style={{ height: 52, width: "auto", maxWidth: "100%", display: "block" }}
                onError={() => setLogoError(true)}
                priority
              />
            )}
          </Link>
          <CategoriesMenu />
        </div>
        <div style={{ flex: 1, minWidth: 0 }} />
        <nav className="header-nav">
          <Link href="/giris" className="header-nav-link header-nav-link--outline">
            <LogIn size={17} strokeWidth={2} aria-hidden />
            <span>Giriş yap</span>
          </Link>
          <Link href="/kayit" className="header-nav-link header-nav-link--cta">
            <UserPlus size={17} strokeWidth={2} aria-hidden />
            <span>Kayıt ol</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

function HeaderInner() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearSession } = useAuthStore();
  const isActive = (href: string) => pathname === href;

  const handleLogout = async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    clearSession();
    router.push("/giris");
  };

  const categoriesAnchorRef = useRef<HTMLDivElement>(null);
  const [logoError, setLogoError] = useState(false);

  return (
    <header className="header">
      <div className="container header-inner" style={{ display: "flex", gap: "1.5rem" }}>
        <div ref={categoriesAnchorRef} style={{ position: "relative", display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <Link href="/" className="header-logo" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            {logoError ? (
              <>
                <span style={{ width: 32, height: 32, borderRadius: "999px", background: "linear-gradient(135deg, #2563eb, #22c55e)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "0.9rem" }}>U</span>
                <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>UcuzaBak</span>
              </>
            ) : (
              <Image
                src="/logo.png"
                alt="UcuzaBak.com - İndirimleri Yakala"
                width={200}
                height={52}
                style={{ height: 52, width: "auto", maxWidth: "100%", display: "block" }}
                onError={() => setLogoError(true)}
                priority
              />
            )}
          </Link>

          <CategoriesMenu anchorRef={categoriesAnchorRef} />
        </div>

        <HeaderSearch />

        <nav className="header-nav">
          {/* Masaüstü kısayol ikonları */}
          {user?.role !== "ADMIN" && (
            <>
              <Link
                href="/favoriler"
                className={cn(
                  "header-nav-link",
                  isActive("/favoriler") && "header-nav-link--active",
                  "desktop-only"
                )}
              >
                <Heart size={17} strokeWidth={2} aria-hidden />
                <span>Favoriler</span>
              </Link>
              <Link
                href={user ? "/alarm" : "/giris"}
                className={cn(
                  "header-nav-link",
                  isActive("/alarm") && user && "header-nav-link--active",
                  "desktop-only"
                )}
              >
                <Bell size={17} strokeWidth={2} aria-hidden />
                <span>Alarmlar</span>
              </Link>
            </>
          )}

          {/* Mobil arama ikonu */}
          <button
            type="button"
            className="btn-ghost mobile-only"
            onClick={() => router.push("/arama")}
            aria-label="Ara"
          >
            <Search size={18} />
          </button>

          {/* Kullanıcı menüsü */}
          {user ? (
            <Dropdown
              trigger={
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <User size={18} />
                  <span className="desktop-only" style={{ fontSize: "0.85rem" }}>
                    {user.name}
                  </span>
                </span>
              }
              align="right"
            >
              <DropdownItem onClick={() => router.push("/profil")}>
                <User size={14} style={{ marginRight: 6 }} />
                Hesabım
              </DropdownItem>
              <DropdownItem onClick={() => router.push("/favoriler")}>
                <Heart size={14} style={{ marginRight: 6 }} />
                Favorilerim
              </DropdownItem>
              <DropdownItem onClick={() => router.push("/alarm")}>
                <Bell size={14} style={{ marginRight: 6 }} />
                Fiyat alarmlarım
              </DropdownItem>
              {user.role === "ADMIN" && (
                <DropdownItem onClick={() => router.push("/admin")}>
                  <Shield size={14} style={{ marginRight: 6 }} />
                  Admin paneli
                </DropdownItem>
              )}
              <DropdownItem onClick={handleLogout}>
                <LogOut size={14} style={{ marginRight: 6 }} />
                Çıkış
              </DropdownItem>
            </Dropdown>
          ) : (
            <>
              <Link href="/giris" className={cn("header-nav-link header-nav-link--outline", "desktop-only")}>
                <LogIn size={17} strokeWidth={2} aria-hidden />
                <span>Giriş yap</span>
              </Link>
              <Link href="/kayit" className={cn("header-nav-link header-nav-link--cta", "desktop-only")}>
                <UserPlus size={17} strokeWidth={2} aria-hidden />
                <span>Kayıt ol</span>
              </Link>
              {/* Mobilde login/register için sade ikon */}
              <Link
                href="/giris"
                className={cn("header-nav-link header-nav-link--icon-only", "mobile-only")}
                aria-label="Giriş yap"
              >
                <LogIn size={18} strokeWidth={2} aria-hidden />
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function Header() {
  return (
    <Suspense fallback={<HeaderFallback />}>
      <HeaderInner />
    </Suspense>
  );
}

