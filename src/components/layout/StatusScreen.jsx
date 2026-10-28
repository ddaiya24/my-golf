/** 로딩·오류·권한 없음 등 전체 화면 안내. 헤더 로고와 같은 serif 'my golf.'만 쓴다. */
export default function StatusScreen({ title, message, children }) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-8 text-center bg-white pt-safe pb-safe">
      <span className="font-brand italic font-semibold text-[28px] tracking-tight text-brand-deep select-none">my golf.</span>
      {title && <p className="text-[15px] font-semibold text-ink mt-6">{title}</p>}
      {message && <p className="text-[13px] text-muted mt-1.5 leading-relaxed max-w-xs">{message}</p>}
      {children && <div className="flex flex-col items-center gap-2 mt-6 w-full max-w-xs">{children}</div>}
    </div>
  );
}
