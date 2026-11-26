"use client";

import { useId } from "react";

interface Props {
  /** قطر نماد به پیکسل. پیشفرض ۳۲. */
  size?: number;
  className?: string;
  /** نمایش ذرات نور و نقطهٔ متحرک (پیشفرض: بله). */
  animated?: boolean;
  label?: string;
}

const LOOP = "M100 100 C58 44 22 62 36 108 C50 152 92 152 100 100 C108 48 150 48 164 92 C178 138 142 156 100 100 Z";

/**
 * لوگوی «حلقهٔ نکسوس» — دو روبان درهمتنیده (بیانهایت + حرف D)
 * با پالت Aurora، هالهٔ ذرهای و نقطهٔ نورانی متحرک.
 * رنگها از CSS variables میآیند تا با ۶ تم کهکشانی هماهنگ شوند.
 */
export function NexusLogo({ size = 32, className, animated = true, label }: Props) {
  const raw = useId().replace(/:/g, "");
  const gradId = `nx-grad-${raw}`;
  const pathId = `nx-path-${raw}`;
  const blurId = `nx-blur-${raw}`;

  return (
    <svg
      className={className ? `nexus-logo ${className}` : "nexus-logo"}
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      data-animated={animated}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--cx-logo-1, #22D3EE)" />
          <stop offset="50%" stopColor="var(--cx-logo-2, #6366F1)" />
          <stop offset="100%" stopColor="var(--cx-logo-3, #A855F7)" />
        </linearGradient>
        <filter id={blurId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <path id={pathId} d={LOOP} />
      </defs>

      <circle cx="100" cy="100" r="70" fill="var(--cx-logo-1, #22D3EE)" opacity="0.20" filter={`url(#${blurId})`} />
      <use href={`#${pathId}`} fill="none" stroke={`url(#${gradId})`} strokeWidth="15" strokeLinecap="round" opacity="0.95" />
      <use href={`#${pathId}`} fill="none" stroke="#fff" strokeWidth="1.8" opacity="0.70" />

      {animated ? (
        <g className="nexus-logo__particles" fill="var(--cx-logo-1, #22D3EE)">
          <circle cx="34" cy="74" r="2.2" style={{ animationDelay: "0s" }} />
          <circle cx="170" cy="66" r="1.8" style={{ animationDelay: ".6s" }} />
          <circle cx="62" cy="168" r="2" style={{ animationDelay: "1.2s" }} />
          <circle cx="150" cy="160" r="1.6" style={{ animationDelay: ".3s" }} />
          <circle cx="24" cy="132" r="1.5" style={{ animationDelay: ".9s" }} />
          <circle cx="184" cy="120" r="2" style={{ animationDelay: "1.5s" }} />
        </g>
      ) : null}

      {animated ? (
        <circle className="nexus-logo__spark" r="4.5" fill="#fff">
          <animateMotion dur="5s" repeatCount="indefinite">
            <mpath href={`#${pathId}`} />
          </animateMotion>
        </circle>
      ) : null}

      <circle cx="100" cy="100" r="8" fill="#fff" />
    </svg>
  );
}
