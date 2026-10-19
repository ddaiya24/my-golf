import Icon from '../Icon';
import { WEEKDAYS, buildMonthCells, formatMonthKeyLong, shiftMonth, todayISO } from '../../utils/date';

const DOT_COLOR = { field: 'bg-brand', screen: 'bg-faint', practice: 'bg-gold' };
const TYPE_ORDER = ['field', 'screen', 'practice'];

/** 월 달력. 기록이 있는 날짜 아래에 종류별 점을 표시한다. */
export default function RecordCalendar({ month, entries, selectedDate, onSelectDate, onChangeMonth }) {
  const today = todayISO();
  const typesByDate = new Map();
  for (const entry of entries) {
    if (!typesByDate.has(entry.date)) typesByDate.set(entry.date, new Set());
    typesByDate.get(entry.date).add(entry.type);
  }
  const cells = buildMonthCells(month);
  const monthCount = entries.filter((entry) => entry.date.startsWith(month)).length;

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between pb-2.5 border-b border-hairline">
        <div className="flex items-center -ml-2">
          <button
            type="button"
            onClick={() => onChangeMonth(shiftMonth(month, -1))}
            aria-label="이전 달"
            className="w-9 h-9 flex items-center justify-center text-muted"
          >
            <Icon name="chevron_left" className="text-[22px]" />
          </button>
          <span className="text-[14px] text-ink font-semibold tracking-tight tabular-nums min-w-[86px] text-center">
            {formatMonthKeyLong(month)}
          </span>
          <button
            type="button"
            onClick={() => onChangeMonth(shiftMonth(month, 1))}
            aria-label="다음 달"
            className="w-9 h-9 flex items-center justify-center text-muted"
          >
            <Icon name="chevron_right" className="text-[22px]" />
          </button>
        </div>
        <span className="text-[11px] text-faint tracking-wider font-medium uppercase">{monthCount} {monthCount === 1 ? 'Entry' : 'Entries'}</span>
      </div>

      <div className="grid grid-cols-7 pt-3 pb-1">
        {WEEKDAYS.map((day) => (
          <span key={day} className="text-center text-[11px] font-medium text-faint">
            {day}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((cell, index) =>
          cell ? (
            <button
              key={cell.iso}
              type="button"
              onClick={() => onSelectDate(cell.iso)}
              aria-label={`${cell.day}일${typesByDate.has(cell.iso) ? ', 기록 있음' : ''}`}
              aria-pressed={cell.iso === selectedDate}
              className="flex flex-col items-center justify-start h-12 pt-1"
            >
              <span
                className={`w-8 h-8 flex items-center justify-center rounded-full text-[14px] tabular-nums ${
                  cell.iso === selectedDate
                    ? 'bg-brand text-white font-semibold'
                    : cell.iso === today
                      ? 'text-brand font-bold'
                      : 'text-ink'
                }`}
              >
                {cell.day}
              </span>
              <span className="flex items-center gap-0.5 h-1.5 mt-0.5">
                {TYPE_ORDER.filter((type) => typesByDate.get(cell.iso)?.has(type)).map((type) => (
                  <span key={type} className={`w-1 h-1 rounded-full ${DOT_COLOR[type]}`} />
                ))}
              </span>
            </button>
          ) : (
            <span key={`blank-${index}`} />
          ),
        )}
      </div>
      <div className="flex items-center justify-end gap-3 pt-2 pb-1 text-[11px] text-faint">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-brand" />
          필드
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-faint" />
          스크린
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-gold" />
          연습
        </span>
      </div>
    </div>
  );
}
