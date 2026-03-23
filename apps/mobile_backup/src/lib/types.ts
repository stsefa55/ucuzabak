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
  id: string;
  name: string;
  iconUrl?: string | null;
};

export type CompareItem = {
  product: Product;
};

