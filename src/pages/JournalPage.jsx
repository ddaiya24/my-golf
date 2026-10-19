import { Link, useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon';
import EmptyState from '../components/ui/EmptyState';
import JournalRecordRow from '../components/records/JournalRecordRow';
import RecordCalendar from '../components/records/RecordCalendar';
import { useData } from '../data/DataProvider';
import { groupByMonth, sortNewestFirst, toEntries } from '../domain/entries';
import { isCategoryBest } from '../domain/stats';
import { formatFullDate, formatMonthKey, isValidISODate, isValidMonthKey, todayISO } from '../utils/date';

const FILTERS = [
  { value: 'all', label: '전체' },
  { value: 'field', label: '필드' },
  { value: 'screen', label: '스크린' },
  { value: 'practice', label: '연습' },
];

const FILTER_EMPTY = {
  all: '아직 기록이 없습니다',
  field: '필드 기록이 없습니다',
  screen: '스크린 기록이 없습니다',
  practice: '연습 기록이 없습니다',
};

export default function JournalPage() {
  const { rounds, practices } = useData();
  const [params, setParams] = useSearchParams();

  // 필터·보기 상태를 주소에 두어, 상세 화면에서 돌아와도 유지되게 한다.
  const filter = FILTERS.some((f) => f.value === params.get('type')) ? params.get('type') : 'all';
  const view = params.get('view') === 'calendar' ? 'calendar' : 'list';
  const selectedDate = isValidISODate(params.get('date')) ? params.get('date') : todayISO();
  const month = isValidMonthKey(params.get('month')) ? params.get('month') : selectedDate.slice(0, 7);

  const updateParams = (patch) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (value == null) next.delete(key);
      else next.set(key, value);
    }
    setParams(next, { replace: true });
  };

  const allEntries = sortNewestFirst(toEntries(rounds, practices));
  const entries = filter === 'all' ? allEntries : allEntries.filter((entry) => entry.type === filter);
  const bestRoundIds = new Set(rounds.filter((round) => isCategoryBest(round, rounds)).map((round) => round.id));
  const renderRow = (entry) => (
    <JournalRecordRow key={entry.key} entry={entry} isBest={entry.kind === 'round' && bestRoundIds.has(entry.id)} />
  );

  const dayEntries = entries.filter((entry) => entry.date === selectedDate);

  return (
    <div className="flex flex-col w-full">
      <section className="flex flex-col pt-5 pb-3">
        <div className="flex items-end justify-between mb-4">
          <div className="flex items-baseline gap-2.5">
            <h1 className="text-[30px] font-bold text-ink tracking-tight leading-none">일지</h1>
            <span className="text-[13px] text-faint font-medium">총 {allEntries.length}개 기록</span>
          </div>
          <div className="flex items-center bg-subtle p-0.5 rounded-full">
            {[
              { value: 'list', icon: 'format_list_bulleted', label: '목록 보기' },
              { value: 'calendar', icon: 'calendar_month', label: '달력 보기' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                aria-label={option.label}
                aria-pressed={view === option.value}
                onClick={() => updateParams({ view: option.value === 'list' ? null : option.value })}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  view === option.value ? 'bg-white text-brand-deep shadow-sm' : 'text-faint hover:text-brand-deep'
                }`}
              >
                <Icon name={option.icon} className="text-[18px]" />
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5" role="tablist">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={filter === option.value}
              onClick={() => updateParams({ type: option.value === 'all' ? null : option.value })}
              className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium tracking-tight transition-all shrink-0 ${
                filter === option.value ? 'bg-brand text-white' : 'bg-subtle text-muted hover:text-ink'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {view === 'list' ? (
        entries.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title={FILTER_EMPTY[filter]}
              description="기록을 추가하면 날짜순으로 정리됩니다."
              actionLabel="기록 추가"
              actionTo={filter === 'all' ? '/records/new' : `/records/new?type=${filter}`}
            />
          </div>
        ) : (
          groupByMonth(entries).map((group) => (
            <section key={group.month} className="flex flex-col mt-4">
              <div className="flex items-center justify-between pb-2.5 border-b border-hairline">
                <span className="text-[14px] text-muted font-semibold tracking-tight tabular-nums">
                  {formatMonthKey(group.month)}
                </span>
                <span className="text-[11px] text-faint tracking-wider font-medium uppercase">
                  {group.entries.length} {group.entries.length === 1 ? 'Entry' : 'Entries'}
                </span>
              </div>
              <div className="flex flex-col divide-y divide-hairline">{group.entries.map(renderRow)}</div>
            </section>
          ))
        )
      ) : (
        <section className="flex flex-col mt-4">
          <RecordCalendar
            month={month}
            entries={entries}
            selectedDate={selectedDate}
            onSelectDate={(date) => updateParams({ date, month: date.slice(0, 7) })}
            onChangeMonth={(nextMonth) => updateParams({ month: nextMonth })}
          />
          <div className="flex items-center justify-between pt-5 pb-2.5 border-b border-hairline">
            <span className="text-[14px] text-muted font-semibold tracking-tight">{formatFullDate(selectedDate)}</span>
            <span className="text-[11px] text-faint tracking-wider font-medium uppercase">
              {dayEntries.length} {dayEntries.length === 1 ? 'Entry' : 'Entries'}
            </span>
          </div>
          {dayEntries.length === 0 ? (
            <p className="text-[13px] text-faint text-center py-8">이 날의 기록이 없습니다.</p>
          ) : (
            <div className="flex flex-col divide-y divide-hairline">{dayEntries.map(renderRow)}</div>
          )}
        </section>
      )}

      <div className="fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 pointer-events-none">
        <div className="max-w-xl mx-auto px-5 md:px-6 flex justify-end">
          <Link
            to={
              view === 'calendar'
                ? `/records/new?date=${selectedDate}${filter !== 'all' ? `&type=${filter}` : ''}`
                : `/records/new${filter !== 'all' ? `?type=${filter}` : ''}`
            }
            aria-label="새 기록 추가"
            className="pointer-events-auto flex items-center gap-1.5 px-4 py-2.5 bg-brand text-white rounded-full shadow-[0_4px_16px_rgba(18,63,50,0.22)] active:scale-95 transition-all"
          >
            <Icon name="edit_note" className="text-[18px]" />
            <span className="text-[13px] font-semibold tracking-tight">+ 기록</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
