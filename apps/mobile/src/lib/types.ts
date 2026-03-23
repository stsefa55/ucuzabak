export type Money = {
  currency?: string;
  amount: number;
};

export type Offer = {
  id: string;
  storeName: string;
  price: Money;
  url?: string;
};

export type Product = {
  id: string;
  slug?: string;
  dataSource?: "backend" | "mock";
  name: string;
  imageUrl?: string | null;
  ratingAvg?: number | null;
  ratingCount?: number | null;

  price: Money;
  oldPrice?: Money | null;
  priceDropPercent?: number | null;

  storeCount: number;
  specs?: Record<string, string | number | boolean | null | undefined>;
  offers?: Offer[];
};

export type Category = {
  // Mobile navigation uses `id` as category slug
  id: string;
  name: string;
  slug?: string;
  iconName?: string | null;
  imageUrl?: string | null;
  sortOrder?: number | null;
  isActive?: boolean;
};

export type CompareItem = {
  product: Product;
};

