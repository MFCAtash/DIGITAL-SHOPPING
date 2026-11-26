import Image from "next/image";

interface Props {
  src: string;
  alt?: string;
  priority?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  className?: string;
}

/** تصویر بهینهشدهٔ Next با ابعاد ثابت (جلوگیری از CLS)؛ منابع خارجی بدون بهینهسازی سرور نمایش داده میشوند. */
export function ProductImage({ src, alt = "", priority = false, width = 400, height = 500, sizes = "(max-width: 640px) 100vw, 25vw", className }: Props) {
  const external = /^https?:\/\//i.test(src);
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      className={className ?? "cx-image-contain"}
      loading={priority ? undefined : "lazy"}
      priority={priority}
      unoptimized={external}
    />
  );
}
