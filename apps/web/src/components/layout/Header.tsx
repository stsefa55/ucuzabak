"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Heart, LogIn, LogOut, Menu, Shield, User, UserPlus, Bell } from "lucide-react";
import { useAuthStore } from "../../stores/auth-store";
import { apiFetch } from "../../lib/api-client";
import { Dropdown, DropdownItem } from "../ui/dropdown";
import { CategoriesMenu } from "./CategoriesMenu";
import { HeaderSearch } from "./HeaderSearch";
import { HeaderMobileSearch } from "./HeaderMobileSearch";
import { MobileMenu } from "./MobileMenu";
import { cn } from "../../lib/utils";

function LogoImage() {
  const [logoError, setLogoError] = useState(false);
  if (logoError) {
    return (
      <>
        <span className="header-logo-fallback-icon">U</span>
        <span className="header-logo-fallback-text">UcuzaBak</span>
      </>
    );
  }
  return (
    <Image
      src="/logo.png"
      alt="UcuzaBak.com - İndirimleri Yakala"
      width={200}
      height={52}
      style={{ height: 52, width: "auto", maxWidth: "100%", display: "block" }}
      onError={() => setLogoError(true)}
      priority
    />
  );
}

function HeaderFallback() {
  return (
    <>
      <header className="header">
        <div className="container header-inner" style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
          {/* Mobil hamburger */}
          <button type="button" className="header-hamburger mobile-only" aria-label="Menü">
            <Menu size={22} />
          </button>

          {/* Masaüstü: logo + kategoriler */}
          <div className="desktop-only" style={{ position: "relative", display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <Link href="/" className="header-logo" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <LogoImage />
            </Link>
          </div>

          {/* Mobil: logo ortada */}
          <Link href="/" className="header-logo-mobile mobile-only">
            <LogoImage />
          </Link>

          <div style={{ flex: 1, minWidth: 0 }} className="desktop-only" />
          <nav className="header-nav">
            <Link href="/giris" className="header-nav-link header-nav-link--outline desktop-only">
              <LogIn size={17} strokeWidth={2} aria-hidden />
              <span>Giriş yap</span>
            </Link>
            <Link href="/kayit" className="header-nav-link header-nav-link--cta desktop-only">
              <UserPlus size={17} strokeWidth={2} aria-hidden />
              <span>Kayıt ol</span>
            </Link>
            <Link href="/giris" className="header-nav-link header-nav-link--icon-only mobile-only" aria-label="Giriş yap">
              <User size={18} strokeWidth={2} aria-hidden />
            </Link>
          </nav>
        </div>
      </header>
      {/* Mobil arama - header dışında */}
      <div className="header-mobile-search-below">
        <div className="container">
          <HeaderMobileSearch />
        </div>
      </div>
    </>
  );
}

function HeaderInner() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearSession } = useAuthStore();
  const isActive = (href: string) => pathname === href;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  return (
    <>
      <header className="header">
        <div className="container header-inner" style={{ display: "flex", gap: "1.5rem" }}>
          {/* Mobil: hamburger (solda) */}
          <button
            type="button"
            className="header-hamburger mobile-only"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Menü"
          >
            <Menu size={22} />
          </button>

          {/* Masaüstü: logo + kategoriler (orijinal yapı) */}
          <div ref={categoriesAnchorRef} className="desktop-only" style={{ position: "relative", display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <Link href="/" className="header-logo" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <LogoImage />
            </Link>
            <CategoriesMenu anchorRef={categoriesAnchorRef} />
          </div>

          {/* Mobil: logo (ortada) */}
          <Link href="/" className="header-logo-mobile mobile-only">
            <LogoImage />
          </Link>

          {/* Masaüstü: arama */}
          <HeaderSearch />

          {/* Sağ: nav ikonları */}
          <nav className="header-nav">
            {/* Mobil: favoriler + alarmlar ikonları (her zaman görünür) */}
            <Link
              href="/favoriler"
              className={cn(
                "header-nav-link header-nav-link--icon-only",
                isActive("/favoriler") && "header-nav-link--active",
                "mobile-only"
              )}
              aria-label="Favoriler"
            >
              <Heart size={20} strokeWidth={1.8} aria-hidden />
            </Link>
            <Link
              href={user ? "/alarm" : "/giris"}
              className={cn(
                "header-nav-link header-nav-link--icon-only",
                isActive("/alarm") && user && "header-nav-link--active",
                "mobile-only"
              )}
              aria-label="Alarmlar"
            >
              <Bell size={20} strokeWidth={1.8} aria-hidden />
            </Link>

            {/* Masaüstü: favoriler + alarmlar (yazılı) */}
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
                {/* Mobil: hesap ikonu */}
                <Link
                  href="/giris"
                  className={cn("header-nav-link header-nav-link--icon-only", "mobile-only")}
                  aria-label="Giriş yap"
                >
                  <User size={20} strokeWidth={1.8} aria-hidden />
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Mobil arama - header DIŞINDA */}
      <div className="header-mobile-search-below">
        <div className="container">
          <HeaderMobileSearch />
        </div>
      </div>

      {/* Mobil drawer menü */}
      {mobileMenuOpen && <MobileMenu onClose={() => setMobileMenuOpen(false)} />}
    </>
  );
}

export function Header() {
  return (
    <Suspense fallback={<HeaderFallback />}>
      <HeaderInner />
    </Suspense>
  );
}
