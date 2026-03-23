import { Platform } from "react-native";

export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 32,
  8: 40,
  9: 48
} as const;

export const radius = {
  sm: 10,
  md: 12,
  lg: 16,
  pill: 999
} as const;

export const colors = {
  bg: "#FFFFFF",
  bgSubtle: "#F7F7F8",
  text: "#0B0B0F",
  textSubtle: "#6B7280",
  border: "#E6E7EB",

  brand: "#2563EB",
  brandSoft: "#EEF2FF",

  success: "#16A34A",
  danger: "#DC2626",

  badgeSoft: "#F1F5F9"
} as const;

export const type = {
  title: { fontSize: 24, lineHeight: 30, fontWeight: "600" as const },
  headline: { fontSize: 18, lineHeight: 24, fontWeight: "600" as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: "400" as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "400" as const },

  price: { fontSize: 22, lineHeight: 28, fontWeight: "700" as const },
  priceOld: { fontSize: 12, lineHeight: 16, fontWeight: "500" as const }
} as const;

export const shadow = {
  card: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 }
    },
    android: { elevation: 3 },
    default: {}
  }),
  floating: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 }
    },
    android: { elevation: 6 },
    default: {}
  })
} as const;

