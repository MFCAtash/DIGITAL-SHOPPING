import { NexusLogo } from "@/components/nexus-logo";
import { ProductGridSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div style={{ paddingBlockStart: "var(--cx-space-6)" }}>
      <div className="route-loader">
        <NexusLogo size={64} />
        <span>Digital Shopping — Loading…</span>
      </div>
      <ProductGridSkeleton />
    </div>
  );
}
