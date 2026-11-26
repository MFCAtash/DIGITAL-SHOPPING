export type StockLevel = "in" | "low" | "out" | "unavailable";

export const LOW_STOCK_THRESHOLD = 3;

/** «unavailable»: آگهی قابل مشاهده ولی غیرقابل خرید (قیمت تقریبی/بازبینی‌نشده). */
export function stockLevel(stock: number, purchasable: boolean): StockLevel {
  if (!purchasable) return "unavailable";
  if (stock <= 0) return "out";
  return stock <= LOW_STOCK_THRESHOLD ? "low" : "in";
}
