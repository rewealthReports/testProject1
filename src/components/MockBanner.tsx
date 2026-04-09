export function MockBanner() {
  return (
    <div className="print:hidden bg-amber-50 border border-amber-300 text-amber-900 text-xs px-4 py-2 flex items-center gap-2">
      <span className="font-bold uppercase tracking-wide">Mock Mode</span>
      <span className="opacity-70">—</span>
      <span>
        Local development context. Data is stored in browser localStorage only.
        This is <strong>not</strong> a live PlannerXchange installation.
      </span>
    </div>
  );
}
