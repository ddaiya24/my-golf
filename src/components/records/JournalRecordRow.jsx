import { Link } from 'react-router-dom';
import Icon from '../Icon';
import { formatMonthDayWeekday } from '../../utils/date';
import { TYPE_LABEL, formatToPar, practiceTopClub, toPar } from '../../domain/golf';
import { recordPath } from '../../domain/entries';

/** Stitch 일지 화면의 카드 없는 리스트 행 */
export default function JournalRecordRow({ entry, isBest = false }) {
  const isRound = entry.kind === 'round';
  const tag = isRound ? `${TYPE_LABEL[entry.type]} ${entry.round.holes}홀` : '연습장';
  const top = isRound ? null : practiceTopClub(entry.practice);

  return (
    <Link
      to={recordPath(entry)}
      className="flex items-center justify-between py-4 hover:bg-[#f8faf9] active:bg-subtle transition-colors group"
    >
      <div className="flex flex-col min-w-0 pr-3 gap-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] text-faint font-medium whitespace-nowrap">{formatMonthDayWeekday(entry.date)}</span>
          <span className="w-1 h-1 rounded-full bg-[#d0d7d4] shrink-0" />
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-medium bg-subtle whitespace-nowrap ${
              entry.type === 'field' ? 'text-brand' : 'text-muted'
            }`}
          >
            {tag}
          </span>
        </div>
        <h2 className="text-[16px] text-ink font-semibold tracking-tight truncate mt-0.5">{entry.title}</h2>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {isRound ? (
          <div className="flex flex-col items-end">
            <div className="flex items-baseline gap-1">
              {isBest && <span className="text-[11px] text-[#a06d15] font-bold tracking-tight">라베</span>}
              <span className="text-[26px] leading-tight font-bold text-ink tabular-nums tracking-tight">
                {entry.round.total_strokes}
                <span className="text-[13px] text-muted font-normal ml-0.5">타</span>
              </span>
            </div>
            <span className="text-[12px] text-faint font-medium tabular-nums">
              {formatToPar(toPar(entry.round.total_strokes, entry.round.holes), 'even')}
            </span>
          </div>
        ) : (
          top && (
            <div className="flex flex-col items-end">
              <div className="flex items-baseline gap-1">
                <span className="text-[11px] text-faint font-medium">최장</span>
                <span className="text-[26px] leading-tight font-bold text-ink tabular-nums tracking-tight">
                  {top.max_distance_m}
                  <span className="text-[13px] text-muted font-normal ml-0.5">m</span>
                </span>
              </div>
              <span className="text-[11px] text-faint font-medium">
                {top.club}
                {entry.practice.clubs.length > 1 && ` 외 ${entry.practice.clubs.length - 1}개`}
              </span>
            </div>
          )
        )}
        <Icon name="chevron_right" className="text-[#c0c7c3] group-hover:text-ink transition-colors text-[20px]" />
      </div>
    </Link>
  );
}
