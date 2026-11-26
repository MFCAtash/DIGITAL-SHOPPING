import { Cinzel_Decorative, Inter, Lalezar, Playfair_Display, Vazirmatn } from "next/font/google";

// برند: Cinzel Decorative | تیتر لاتین: Playfair Display | متن لاتین (EN/DE): Inter | فارسی: Vazirmatn + تیتر Lalezar
const brand = Cinzel_Decorative({ subsets: ["latin"], weight: ["700"], variable: "--font-brand", display: "swap" });
const head = Playfair_Display({ subsets: ["latin"], variable: "--font-head", display: "swap" });
const body = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const fa = Vazirmatn({ subsets: ["arabic", "latin"], variable: "--font-fa", display: "swap" });
const faHead = Lalezar({ subsets: ["arabic", "latin"], weight: "400", variable: "--font-fa-head", display: "swap" });

/** به className عنصر <html> اضافه کنید. */
export const fontVars = [brand, head, body, fa, faHead].map((f) => f.variable).join(" ");
