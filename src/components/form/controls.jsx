import Icon from '../Icon';

// DESIGN.md "Input Fields & Score Selectors":
// 평소 #F7F8F7 바탕, 포커스 시 흰 바탕 + 1.5px #123F32 테두리. iOS 확대를 막기 위해 글자 16px.
const inputBase =
  'w-full h-12 px-4 rounded-xl bg-fill border-[1.5px] border-transparent text-[16px] text-ink placeholder:text-gray-400 outline-none transition-colors focus:bg-white focus:border-brand';
const inputError = 'border-danger/60';

export function FormField({ label, htmlFor, error, hint, children }) {
  return (
    <div className="flex flex-col">
      {label && (
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-muted mb-1.5 px-0.5">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-[12px] text-danger mt-1.5 px-0.5">{error}</p>
      ) : (
        hint && <p className="text-[12px] text-faint mt-1.5 px-0.5">{hint}</p>
      )}
    </div>
  );
}

export function TextInput({ invalid, className = '', ...props }) {
  return <input type="text" className={`${inputBase} ${invalid ? inputError : ''} ${className}`} {...props} />;
}

export function DateInput({ invalid, ...props }) {
  return <input type="date" className={`${inputBase} ${invalid ? inputError : ''} text-left`} {...props} />;
}

export function SelectInput({ invalid, children, ...props }) {
  return (
    <div className="relative">
      <select className={`${inputBase} ${invalid ? inputError : ''} appearance-none pr-10`} {...props}>
        {children}
      </select>
      <Icon name="expand_more" className="absolute right-3 top-1/2 -translate-y-1/2 text-[20px] text-faint pointer-events-none" />
    </div>
  );
}

export function TextArea({ className = '', ...props }) {
  return (
    <textarea
      rows={3}
      className={`w-full px-4 py-3 rounded-xl bg-fill border-[1.5px] border-transparent text-[16px] text-ink placeholder:text-gray-400 outline-none transition-colors focus:bg-white focus:border-brand resize-none ${className}`}
      {...props}
    />
  );
}

const digitsOnly = (value) => value.replace(/[^0-9]/g, '').slice(0, 4);

/** 숫자 키패드가 뜨는 정수 입력칸. 값은 문자열로 다룬다. */
export function NumberInput({ value, onChange, unit, invalid, className = '', ...props }) {
  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(digitsOnly(event.target.value))}
        // 탭하면 기존 숫자를 선택해서 바로 덮어쓸 수 있게 한다.
        onFocus={(event) => event.target.select()}
        className={`${inputBase} ${invalid ? inputError : ''} tabular-nums ${unit ? 'pr-10' : ''} ${className}`}
        {...props}
      />
      {unit && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] text-faint pointer-events-none">{unit}</span>
      )}
    </div>
  );
}

/** DESIGN.md의 원형 스텝 버튼 + 숫자 입력 */
export function Stepper({ id, value, onChange, min = 0, max = 999, start, unit, invalid }) {
  const step = (delta) => {
    const current = value === '' ? null : Number(value);
    const next = current == null ? (start ?? min) : current + delta;
    onChange(String(Math.min(max, Math.max(min, next))));
  };
  const buttonClass =
    'w-12 h-12 shrink-0 rounded-full bg-white border border-hairline flex items-center justify-center text-ink active:bg-fill disabled:opacity-40';
  return (
    <div className="flex items-center gap-3">
      <button type="button" className={buttonClass} onClick={() => step(-1)} aria-label="1 줄이기" disabled={value !== '' && Number(value) <= min}>
        <Icon name="remove" className="text-[20px]" />
      </button>
      <div className="flex-1">
        <NumberInput
          id={id}
          value={value}
          onChange={onChange}
          unit={unit}
          invalid={invalid}
          placeholder="직접 입력"
          className="text-center text-[18px] font-semibold placeholder:text-[15px] placeholder:font-normal"
        />
      </div>
      <button type="button" className={buttonClass} onClick={() => step(1)} aria-label="1 늘리기" disabled={value !== '' && Number(value) >= max}>
        <Icon name="add" className="text-[20px]" />
      </button>
    </div>
  );
}

/** iOS 스타일 세그먼트 컨트롤 (Stitch 일지의 목록/달력 토글과 같은 트랙 색) */
export function Segmented({ options, value, onChange, size = 'md', ariaLabel }) {
  const height = size === 'lg' ? 'h-11' : 'h-10';
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex items-center bg-subtle p-1 rounded-xl">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={`flex-1 ${height} rounded-[10px] text-[14px] tracking-tight transition-all disabled:opacity-40 ${
              active ? 'bg-white text-brand-deep font-semibold shadow-sm' : 'text-muted font-medium'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function PrimaryButton({ children, className = '', ...props }) {
  return (
    <button
      className={`w-full h-[50px] rounded-xl bg-brand text-white text-[15px] font-semibold active:scale-[0.98] active:opacity-90 transition-all disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = '', ...props }) {
  return (
    <button
      className={`w-full h-[50px] rounded-xl bg-fill border border-hairline text-ink text-[15px] font-semibold active:scale-[0.98] transition-all ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
