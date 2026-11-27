"use client";

import { useState } from "react";
import { Button } from "@digital-shopping/ui";
import { engagement } from "@/lib/api";
import { useStore } from "./providers";
import { useT } from "./locale-provider";

export function ReviewForm({ slug }: { slug: string }) {
  const { user, notify } = useStore();
  const { t } = useT();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  if (!user) return <p style={{ fontSize: "var(--cx-text-sm)", color: "var(--cx-muted)" }}>{t("review.loginRequired")}</p>;

  return (
    <form
      className="form-stack"
      onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        void engagement.addReview(slug, { rating, title, body })
          .then(() => {
            notify(t("review.submitted"), "success");
            setTitle(""); setBody("");
          })
          .catch(() => notify(t("review.failed"), "danger"))
          .finally(() => setBusy(false));
      }}
    >
      <fieldset className="cx-fieldset" style={{ display: "flex", gap: "var(--cx-space-2)", border: 0, padding: 0 }}>
        <legend className="cx-field__label">{t("review.rating")}</legend>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="chip">
            <input type="radio" name="rating" checked={rating === n} onChange={() => setRating(n)} /> {n}
          </label>
        ))}
      </fieldset>
      <input className="cx-input" aria-label={t("review.title")} placeholder={t("review.titleOptional")} value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea className="cx-input" aria-label={t("review.body")} placeholder={t("review.bodyPlaceholder")} value={body} onChange={(e) => setBody(e.target.value)} rows={4} required />
      <Button type="submit" variant="secondary" loading={busy} disabled={!body.trim()}>{t("review.submit")}</Button>
    </form>
  );
}
