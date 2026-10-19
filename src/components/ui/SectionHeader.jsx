/** Stitch의 "PERSONAL BEST ··· 역대 최고 기록" 형태 섹션 라벨 */
export default function SectionHeader({ label, right, rightClassName = 'text-faint' }) {
  return (
    <div className="flex items-center justify-between mb-2.5 px-0.5">
      <span className="text-[11px] font-semibold text-faint uppercase tracking-wider">{label}</span>
      {right && <span className={`text-xs font-normal ${rightClassName}`}>{right}</span>}
    </div>
  );
}
