"use client";

import { useEffect } from "react";
import { Button } from "@codex/ui";
import { useT } from "@/components/locale-provider";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useT();
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);
  return (
    <div className="panel" style={{ textAlign: "center", marginBlockStart: "var(--cx-space-8)" }}>
      <h2>{t("common.errorTitle")}</h2>
      <p>{t("common.errorDesc")}</p>
      <Button variant="primary" onClick={reset}>{t("common.retry")}</Button>
    </div>
  );
}
