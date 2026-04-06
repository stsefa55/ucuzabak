import { redirect } from "next/navigation";

/** İngilizce URL uyumluluğu — asıl sayfa `/admin/yedekler`. */
export default function AdminBackupsRedirectPage() {
  redirect("/admin/yedekler");
}
