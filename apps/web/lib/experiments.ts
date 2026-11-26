import { cookies } from "next/headers";
import { bucket, type Variant } from "./ab-core";

export { bucket, EXPERIMENTS, type Variant } from "./ab-core";

/** خواندن واریانت آزمایش از کوکی؛ اگر کوکی نباشد، واریانت پیشفرض A است. */
export async function experimentVariant(key: string): Promise<Variant> {
  try {
    const jar = await cookies();
    const id = jar.get(`cx_ab_${key}`)?.value;
    return id ? bucket(key, id) : "A";
  } catch {
    return "A";
  }
}
