/** اتصال نام کلاس‌ها؛ مقدارهای falsy نادیده گرفته می‌شوند. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
