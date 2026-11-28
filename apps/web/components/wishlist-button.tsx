"use client";

import { useEffect, useState } from "react";
import { engagement } from "@/lib/api";
import { useStore } from "./providers";
import { useT } from "./locale-provider";

export function WishlistButton({ slug }: { slug: string }) {
  const { user, notify } = useStore();
  const { t, locale } = useT();
  const [wished, setWished] = useState(false);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    void engagement.wishlist(locale)
      .then((d) => { if (alive) setWished(d.items.some((p) => p.slug === slug)); })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [slug, user, locale]);

  if (!user) {
    return <a href="/checkout" className="chip">{t("wishlist.loginToSave")}</a>;
  }

  return (
    <button
      type="button"
      className={`chip ${wished ? "chip--active" : ""}`}
      aria-pressed={wished}
      onClick={() => {
        const next = !wished;
        setWished(next);
        void (next ? engagement.wish(slug) : engagement.unwish(slug))
          .then(() => notify(next ? t("wishlist.added") : t("wishlist.removed"), "success"))
          .catch(() => { setWished(!next); notify(t("common.actionFailed"), "danger"); });
      }}
    >
      {wished ? t("wishlist.saved") : t("wishlist.add")}
    </button>
  );
}
