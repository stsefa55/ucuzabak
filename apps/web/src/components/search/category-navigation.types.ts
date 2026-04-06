/** Kategori sayfası API: GET /categories/:slug/navigation-panel */
export type CategoryNavigationContext = {
  navigationMode?: "current_children" | "root_children" | "siblings";
  current: { slug: string; name: string; pathSlugs: string[]; pathNames: string[] };
  parent: { slug: string; name: string; pathSlugs: string[]; pathNames: string[] } | null;
  siblings: Array<{
    id: number;
    name: string;
    slug: string;
    productCount: number;
    pathSlugs: string[];
    pathNames: string[];
    iconName?: string | null;
    imageUrl?: string | null;
    /** Doğrudan alt kategori var mı (accordion ok) */
    hasChildren?: boolean;
  }>;
};
