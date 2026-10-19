import { useState } from 'react';
import { Link } from 'react-router-dom';
import ScoreTrendChart from '../components/growth/ScoreTrendChart';
import DistanceBars from '../components/growth/DistanceBars';
import { useData } from '../data/DataProvider';
import { TYPE_LABEL, roundTitle } from '../domain/golf';
import { goalProgress } from '../domain/goals';
import { bestDistance, bestRound, driverMonthly, driverRecords, recentAverage, roundsOf, scoreSeries } from '../domain/stats';
import { formatMonthDay, formatMonthShort } from '../utils/date';

const card = 'w-full bg-white rounded-2xl p-5 border border-neutral-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)] flex flex-col gap-4';

const pillTrack = 'flex items-center bg-neutral-100 p-0.5 rounded-full gap-0.5';
const pillClass = (active) =>
  `px-2.5 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
    active ? 'bg-neutral-900 text-white shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
  }`;

function defaultSelection(rounds) {
  const type = roundsOf(rounds, { type: 'field' }).length > 0 || roundsOf(rounds, { type: 'screen' }).length === 0 ? 'field' : 'screen';
  const holes = roundsOf(rounds, { type, holes: 18 }).length > 0 || roundsOf(rounds, { type, holes: 9 }).length === 0 ? 18 : 9;
  return { type, holes };
}

function Summary({ title, children }) {
  return (
    <div className="flex flex-col gap-1 bg-fill rounded-xl px-4 py-4">
      {title && <p className="text-[14px] font-semibold text-ink tabular-nums">{title}</p>}
      <p className="text-[12px] text-neutral-500 leading-relaxed">{children}</p>
    </div>
  );
}

export default function GrowthPage() {
  const { rounds, practices, goal } = useData();
  const [selection, setSelection] = useState(() => defaultSelection(rounds));
  const [range, setRange] = useState('recent5');
  const { type, holes } = selection;
  const year = new Date().getFullYear();

  const categoryRounds = roundsOf(rounds, { type, holes });
  const best = bestRound(categoryRounds);
  const average = recentAverage(categoryRounds, 5);
  const series = scoreSeries(rounds, { type, holes, range, year }).map((round) => ({ ...round, title: roundTitle(round) }));

  const goalMatches = goal?.type === 'score' && goal.round_type === type && goal.holes === holes;
  const progress = goalMatches ? goalProgress(goal, rounds, practices) : null;

  const drives = driverRecords(rounds, practices);
  const bestDrive = bestDistance(drives);
  const monthly = driverMonthly(drives);
  const driveRows =
    monthly.length >= 2
      ? monthly.slice(-4).map((m) => ({ key: m.month, label: `${formatMonthShort(m.month)} 평균`, value: m.avg, max: m.max }))
      : drives.slice(-4).map((d, index) => ({ key: `${d.source}-${d.id}-${index}`, label: `${formatMonthDay(d.date)} · ${d.title}`, value: d.value }));
  const driveChange = monthly.length >= 2 ? driveRows[driveRows.length - 1].value - driveRows[0].value : null;

  const metrics = [
    { label: '베스트', value: best?.total_strokes ?? null, unit: '타' },
    { label: '최근 5회 평균', value: average, unit: '타' },
    { label: '라운딩', value: categoryRounds.length, unit: '회' },
  ];

  return (
    <div className="flex flex-col w-full pt-5 pb-6 gap-6">
      <div className="flex flex-col pt-1">
        <span className="text-[11px] font-semibold tracking-wider uppercase text-neutral-400">Journal of Mastery</span>
        <h1 className="text-[26px] font-bold tracking-tight text-neutral-900 mt-0.5">스윙과 성장의 기록</h1>
      </div>

      <div className="flex items-center justify-between gap-2 -mb-2">
        <div className="flex items-center gap-1.5" role="tablist" aria-label="라운드 종류">
          {['field', 'screen'].map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={type === value}
              onClick={() => setSelection((prev) => ({ ...prev, type: value }))}
              className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium tracking-tight transition-all ${
                type === value ? 'bg-brand text-white' : 'bg-subtle text-muted hover:text-ink'
              }`}
            >
              {TYPE_LABEL[value]}
            </button>
          ))}
        </div>
        <div className={pillTrack} role="tablist" aria-label="홀 수">
          {[18, 9].map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={holes === value}
              onClick={() => setSelection((prev) => ({ ...prev, holes: value }))}
              className={pillClass(holes === value)}
            >
              {value}홀
            </button>
          ))}
        </div>
      </div>

      <div className={`${card} gap-3`}>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Key Metrics</span>
          <span className="text-xs text-neutral-400">
            {TYPE_LABEL[type]} · {holes}홀
          </span>
        </div>
        <div className="grid grid-cols-3 divide-x divide-neutral-100 pt-1">
          {metrics.map((metric, index) => (
            <div key={metric.label} className={`flex flex-col min-w-0 ${index === 0 ? 'pr-2' : index === 1 ? 'px-3' : 'pl-3'}`}>
              <span className="text-xs text-neutral-500 mb-1 truncate">{metric.label}</span>
              {metric.value == null ? (
                <span className="text-2xl font-bold tracking-tight text-neutral-300">–</span>
              ) : (
                <div className="flex items-baseline gap-0.5">
                  <span className="text-2xl font-bold tracking-tight text-neutral-900 tabular-nums">{metric.value}</span>
                  <span className="text-xs text-neutral-500">{metric.unit}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className={card}>
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 tracking-tight">스코어 추이</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              {TYPE_LABEL[type]} {holes}홀 · 총 {categoryRounds.length}회
            </p>
          </div>
          {categoryRounds.length >= 2 && (
            <div className={pillTrack}>
              {[
                { value: 'recent5', label: '최근 5회' },
                { value: 'year', label: `${year}년` },
                { value: 'all', label: '전체' },
              ].map((option) => (
                <button key={option.value} type="button" aria-pressed={range === option.value} onClick={() => setRange(option.value)} className={pillClass(range === option.value)}>
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {categoryRounds.length === 0 ? (
          <Summary>
            {TYPE_LABEL[type]} {holes}홀 기록이 없습니다.{' '}
            <Link to={`/records/new?type=${type}`} className="font-semibold text-brand">
              기록 추가
            </Link>
          </Summary>
        ) : series.length < 2 ? (
          <Summary title={series[0] ? `${series[0].total_strokes}타 · ${formatMonthDay(series[0].date)} ${series[0].title}` : null}>
            {series[0] ? '' : '이 기간의 기록이 없습니다. '}
            {categoryRounds.length < 2
              ? '기록이 2개 이상 쌓이면 스코어 추이 그래프가 표시됩니다.'
              : series[0]
                ? '이 기간의 기록이 1개입니다. 다른 기간을 선택해 보세요.'
                : '다른 기간을 선택해 보세요.'}
          </Summary>
        ) : (
          <div className="flex flex-col pt-1">
            {progress && (
              <div className="flex items-center justify-between text-xs mb-3">
                <div className="flex items-center gap-1.5 text-neutral-500">
                  <span className="w-3 h-0.5 bg-amber-600 rounded-full inline-block" />
                  <span>목표 ({goal.target_value}타)</span>
                </div>
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                  {progress.achieved ? '목표 달성' : `${progress.remaining}타 남음`}
                </span>
              </div>
            )}
            <ScoreTrendChart rounds={series} overallBest={best?.total_strokes} goalTarget={progress ? goal.target_value : null} />
            <div className="flex items-center justify-between gap-3 pt-2 mt-2 border-t border-neutral-100 text-xs text-neutral-400">
              <span className="truncate">
                {formatMonthDay(series[0].date)} {series[0].title}
              </span>
              <span className="truncate text-right">
                {formatMonthDay(series[series.length - 1].date)} {series[series.length - 1].title}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className={card}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 tracking-tight">드라이버 비거리 성장</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              {bestDrive ? `최고 ${bestDrive.value}m · ${formatMonthDay(bestDrive.date)} ${bestDrive.title}` : '라운드·연습 기록 기준'}
            </p>
          </div>
          {driveChange != null && driveChange !== 0 && (
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border shrink-0 tabular-nums ${
                driveChange > 0 ? 'bg-brand/5 text-brand border-brand/15' : 'bg-neutral-50 text-neutral-500 border-neutral-200'
              }`}
            >
              {driveChange > 0 ? '+' : ''}
              {driveChange}M
            </span>
          )}
        </div>
        {drives.length === 0 ? (
          <Summary>라운드의 상세 기록이나 연습 기록에 드라이버 비거리를 입력하면 표시됩니다.</Summary>
        ) : drives.length === 1 ? (
          <Summary title={`${drives[0].value}m · ${formatMonthDay(drives[0].date)} ${drives[0].title}`}>
            기록이 2개 이상 쌓이면 비거리 변화가 표시됩니다.
          </Summary>
        ) : (
          <DistanceBars rows={driveRows} />
        )}
      </div>
    </div>
  );
}
