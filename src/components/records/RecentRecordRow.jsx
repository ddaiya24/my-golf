import { Link } from 'react-router-dom';
import Icon from '../Icon';
import { formatMonthDay } from '../../utils/date';
import { TYPE_LABEL, formatToPar, practiceTopClub, toPar } from '../../domain/golf';
import { recordPath } from '../../domain/entries';

function parTone(diff) {
  if (diff > 0) return 'text-gold font-semibold';
  return 'text-brand font-medium';
}

/** Stitch 홈 "Recent Activity" 행 */
export default function RecentRecordRow({ entry }) {
  const isField = entry.type === 'field';
  let value = null;
  let unit = '';
  let sub = null;
  let subClass = 'text-muted font-medium';

  if (entry.kind === 'round') {
    const { total_strokes: strokes, holes } = entry.round;
    const diff = toPar(strokes, holes);
    value = strokes;
    unit = '타';
    sub = holes === 9 ? `9홀 · ${formatToPar(diff, 'long')}` : formatToPar(diff, 'long');
    subClass = parTone(diff);
  } else {
    const top = practiceTopClub(entry.practice);
    if (top) {
      value = top.max_distance_m;
      unit = 'm';
      sub = top.club;
    }
  }

  return (
    <Link
      to={recordPath(entry)}
      className="flex items-center justify-between p-4 active:bg-gray-50 transition-colors"
    >
      <div className="flex flex-col min-w-0 pr-3">
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide ${
              isField ? 'bg-brand text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {TYPE_LABEL[entry.type]}
          </span>
          <span className="text-xs text-gray-400 font-medium">{formatMonthDay(entry.date)}</span>
        </div>
        <span className="text-[15px] font-semibold text-gray-900 tracking-tight truncate">{entry.title}</span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {value != null && (
          <div className="flex flex-col items-end">
            <span className="text-[19px] font-bold text-gray-950 tracking-tight leading-tight tabular-nums">
              {value}
              <span className="text-xs font-normal text-gray-400 ml-0.5">{unit}</span>
            </span>
            <span className={`text-[11px] ${subClass}`}>{sub}</span>
          </div>
        )}
        <Icon name="chevron_right" className="text-[18px] text-gray-300" />
      </div>
    </Link>
  );
}
