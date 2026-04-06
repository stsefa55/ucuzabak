import { permanentRedirect } from "next/navigation";

interface BrandPageProps {
  params: { slug: string };
}

export default function BrandPage({ params }: BrandPageProps) {
  const slug = (params.slug ?? "").trim();
  if (!slug) {
    permanentRedirect("/arama");
  }
  permanentRedirect(`/arama?brandSlug=${encodeURIComponent(slug)}`);
}

