import type { SVGProps } from "react";

/**
 * مجموعهٔ آیکون خطی (۲۴×۲۴، ضخامت ۱٫۵) به‌جای ایموجی. همه با currentColor.
 * آیکون‌های جهت‌دار (chevron-start/end، arrow) با `mirror` در RTL آینه می‌شوند.
 */
const PATHS = {
  search: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>,
  cart: <><path d="M3 4h2.2l1.6 10.2a1 1 0 0 0 1 .8h8.6a1 1 0 0 0 1-.76L19 8H6" /><circle cx="9" cy="19.2" r="1.2" /><circle cx="17" cy="19.2" r="1.2" /></>,
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  compare: <path d="M7 4v14m0 0l-3-3m3 3l3-3M17 20V6m0 0l-3 3m3-3l3 3" />,
  user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.6-3.6 3.4-5.5 7-5.5s6.4 1.9 7 5.5" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  "chevron-down": <path d="M6 9l6 6 6-6" />,
  "chevron-end": <path d="M9 6l6 6-6 6" />,
  "chevron-start": <path d="M15 6l-6 6 6 6" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  filter: <path d="M4 6h16M7 12h10M10 18h4" />,
  sort: <path d="M4 7h10M4 12h7M4 17h4M18 8v9m0 0l-2.5-2.5M18 17l2.5-2.5" />,
  truck: <><path d="M3 6h11v9H3zM14 9h4l3 3v3h-7" /><circle cx="7" cy="17.5" r="1.5" /><circle cx="17" cy="17.5" r="1.5" /></>,
  shield: <path d="M12 3l7 3v5.5c0 4.2-2.8 7.4-7 9.5-4.2-2.1-7-5.3-7-9.5V6zM9 12l2.2 2.2L15 10.5" />,
  bell: <path d="M6 16v-5a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0" />,
  trash: <path d="M5 7h14M9.5 7V5h5v2M7 7l1 12h8l1-12M10.5 11v5M13.5 11v5" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8v.01" /></>,
  alert: <path d="M12 4l9 16H3zM12 10v4.5M12 17.5v.01" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  phone: <path d="M7 3h10a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2" />,
  zoom: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5M11 8.5v5M8.5 11h5" /></>,
  home: <path d="M4 11l8-7 8 7M6 10v10h12V10" />,
} as const;

export type IconName = keyof typeof PATHS;
export const ICON_NAMES = Object.keys(PATHS) as IconName[];

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: number;
  /** آینه‌شدن در RTL (برای آیکون‌های جهت‌دار) */
  mirror?: boolean;
  /** اگر آیکون معنا دارد و متن کنارش نیست */
  title?: string;
}

export function Icon({ name, size = 20, mirror = false, title, className, ...rest }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={["cx-icon", mirror ? "cx-icon--dir" : "", className ?? ""].filter(Boolean).join(" ")}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {PATHS[name]}
    </svg>
  );
}
