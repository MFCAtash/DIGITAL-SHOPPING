"use client";

import { useEffect, useState } from "react";
import { OfflineBanner, useOnline } from "@digital-shopping/ui";
import { useT } from "./locale-provider";

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** قابلیتهای پیشرفتهٔ PWA: هشدار آفلاین، پیشنهاد نصب و بروزرسانی سرویس ورکر. */
export function PwaTools() {
  const { t } = useT();
  const online = useOnline();
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    const onInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as InstallEvent);
    };
    const onUpdate = () => setUpdateReady(true);
    window.addEventListener("beforeinstallprompt", onInstall);
    window.addEventListener("digital-shopping:sw-update", onUpdate);
    return () => {
      window.removeEventListener("beforeinstallprompt", onInstall);
      window.removeEventListener("digital-shopping:sw-update", onUpdate);
    };
  }, []);

  async function install() {
    if (!installEvent) return;
    try {
      await installEvent.prompt();
      await installEvent.userChoice;
    } catch {
      /* کاربر نصب را لغو کرد */
    } finally {
      setInstallEvent(null);
    }
  }

  if (!online) return <OfflineBanner message={t("pwa.offline")} />;

  return (
    <div className="pwa-tools" aria-live="polite">
      {installEvent ? (
        <div className="pwa-tools__bar">
          <span>{t("pwa.installQuestion")}</span>
          <button type="button" className="cx-btn cx-btn--secondary cx-btn--sm" onClick={() => void install()}>{t("pwa.install")}</button>
        </div>
      ) : null}
      {updateReady ? (
        <div className="pwa-tools__bar">
          <span>{t("pwa.updateReady")}</span>
          <button type="button" className="cx-btn cx-btn--primary cx-btn--sm" onClick={() => window.location.reload()}>{t("pwa.update")}</button>
        </div>
      ) : null}
    </div>
  );
}
