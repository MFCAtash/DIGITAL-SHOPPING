export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="product-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="cx-card">
          <div className="skeleton" style={{ aspectRatio: "4 / 5" }} />
          <div className="cx-card__body">
            <div className="skeleton" style={{ inlineSize: "35%", blockSize: 12 }} />
            <div className="skeleton" style={{ inlineSize: "90%", blockSize: 18 }} />
            <div className="skeleton" style={{ inlineSize: "60%", blockSize: 18 }} />
            <div className="skeleton" style={{ inlineSize: "45%", blockSize: 14 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PanelSkeleton() {
  return (
    <div className="panel" aria-hidden="true">
      <div className="skeleton" style={{ inlineSize: "40%", blockSize: 20, marginBlockEnd: 16 }} />
      <div className="skeleton" style={{ inlineSize: "100%", blockSize: 40, marginBlockEnd: 12 }} />
      <div className="skeleton" style={{ inlineSize: "100%", blockSize: 40 }} />
    </div>
  );
}
