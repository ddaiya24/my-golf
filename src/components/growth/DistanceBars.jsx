// Stitch apple_style_3 "드라이버 비거리 성장"의 막대 행.
// rows: [{ key, label, value, max? }] 오래된 순

function barColor(index, count) {
  if (index === count - 1) return 'bg-brand';
  if (index === count - 2) return 'bg-neutral-500';
  return 'bg-neutral-300';
}

export function distanceScale(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const lo = Math.max(0, Math.floor((min * 0.8) / 10) * 10);
  const hi = Math.ceil((max * 1.05) / 10) * 10;
  return { lo, hi: hi > lo ? hi : lo + 10 };
}

export default function DistanceBars({ rows }) {
  const { lo, hi } = distanceScale(rows.map((row) => row.value));
  const bestValue = Math.max(...rows.map((row) => row.value));
  const bestIndex = rows.findIndex((row) => row.value === bestValue);

  return (
    <>
      <div className="flex flex-col gap-3.5 pt-1">
        {rows.map((row, index) => {
          const isLast = index === rows.length - 1;
          const width = Math.max(4, ((row.value - lo) / (hi - lo)) * 100);
          return (
            <div key={row.key} className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`truncate ${isLast ? 'font-bold text-neutral-900' : 'text-neutral-500'}`}>{row.label}</span>
                  {index === bestIndex && rows.length > 1 && (
                    <span className="bg-brand/10 text-brand px-1.5 rounded text-[10px] font-bold tracking-wide">BEST</span>
                  )}
                </div>
                <div className="flex items-baseline gap-1 shrink-0 tabular-nums">
                  <span className={isLast ? 'text-brand font-bold text-base' : 'text-neutral-700 font-semibold text-sm'}>
                    {row.value}
                    <span className={`text-xs font-normal ml-0.5 ${isLast ? 'text-neutral-500' : 'text-neutral-400'}`}>m</span>
                  </span>
                  {row.max != null && row.max !== row.value && <span className="text-neutral-400 text-xs">(최고 {row.max}m)</span>}
                </div>
              </div>
              <div className="w-full h-2.5 bg-neutral-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${barColor(index, rows.length)}`} style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1 border-t border-neutral-100 tabular-nums">
        <span>{lo}M 기준선</span>
        <span>{hi}M MAX</span>
      </div>
    </>
  );
}
