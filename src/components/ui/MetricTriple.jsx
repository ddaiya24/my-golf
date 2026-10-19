const SUB_TONE = {
  gold: 'text-gold font-semibold',
  brand: 'text-brand font-medium',
  muted: 'text-muted font-medium',
};

const VALUE_TONE = {
  ink: 'text-gray-950',
  brand: 'text-brand-deep',
  gold: 'text-gold',
};

/**
 * Stitch 홈 "Personal Best", MY "Lifetime Archive"의 3칸 지표 카드.
 * value가 null이면 임의 숫자 대신 대시를 표시한다.
 */
export default function MetricTriple({ items, align = 'start' }) {
  const alignClass = align === 'center' ? 'items-center text-center' : '';
  return (
    <div className="grid grid-cols-3 bg-white rounded-2xl border border-hairline divide-x divide-hairline py-4 px-2 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      {items.map((item) => (
        <div key={item.label} className={`flex flex-col min-w-0 px-2 min-[400px]:px-3 ${alignClass}`}>
          <span className="text-[11px] font-medium text-muted mb-1.5 truncate">{item.label}</span>
          {item.value == null ? (
            <span className="text-[30px] font-bold tracking-tight leading-none text-gray-300">–</span>
          ) : (
            <div className="flex items-baseline gap-0.5">
              <span
                className={`text-[27px] min-[400px]:text-[30px] font-bold tracking-tight leading-none tabular-nums ${
                  VALUE_TONE[item.valueTone ?? 'ink']
                }`}
              >
                {item.value}
              </span>
              {item.unit && <span className="text-xs font-medium text-gray-400 ml-0.5">{item.unit}</span>}
            </div>
          )}
          <span className={`text-[11px] mt-2 truncate ${SUB_TONE[item.subTone ?? 'muted']}`}>{item.sub ?? ' '}</span>
        </div>
      ))}
    </div>
  );
}
