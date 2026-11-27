"use client";

import { useState } from "react";
import { Switch, Tabs } from "@digital-shopping/ui";
import { useT } from "./locale-provider";

/** قسمت تعاملی صفحهٔ زبان طراحی (لازم است در سمت کلاینت قرار گیرد). */
export function DesignInteractive() {
  const { t } = useT();
  const [on, setOn] = useState(true);
  return (
    <>
      <Switch checked={on} onCheckedChange={setOn} label={t("pdp.fastShip")} />
      <Tabs label={t("design.sample")} items={[
        { value: "a", label: t("design.specsTab"), content: t("design.specsContent") },
        { value: "b", label: t("design.reviewsTab"), content: t("design.reviewsContent") },
      ]} />
    </>
  );
}
