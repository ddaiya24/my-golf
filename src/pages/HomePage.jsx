import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import SectionHeader from '../components/ui/SectionHeader';
import MetricTriple from '../components/ui/MetricTriple';
import EmptyState from '../components/ui/EmptyState';
import RecentRecordRow from '../components/records/RecentRecordRow';
import { useData } from '../data/DataProvider';
import { sortNewestFirst, toEntries } from '../domain/entries';
import { formatToPar, toPar } from '../domain/golf';
import { bestDistance, driverRecords, preferredBest } from '../domain/stats';

function scoreMetric(label, round) {
  if (!round) return { label, value: null, sub: '기록 없음' };
  const diff = toPar(round.total_strokes, round.holes);
  const parText = formatToPar(diff, 'long');
  return {
    label,
    value: round.total_strokes,
    unit: '타',
    sub: round.holes === 9 ? `9홀 · ${parText}` : parText,
    subTone: diff > 0 ? 'gold' : 'muted',
  };
}

export default function HomePage() {
  const { rounds, practices, profile } = useData();
  const entries = sortNewestFirst(toEntries(rounds, practices));
  const recent = entries.slice(0, 3);
  const bestDrive = bestDistance(driverRecords(rounds, practices));

  const metrics = [
    bestDrive
      ? { label: '최장 비거리', value: bestDrive.value, unit: 'm', sub: '드라이버', subTone: 'gold' }
      : { label: '최장 비거리', value: null, sub: '기록 없음' },
    scoreMetric('스크린 베스트', preferredBest(rounds, 'screen')),
    scoreMetric('필드 라베', preferredBest(rounds, 'field')),
  ];

  return (
    <div className="flex flex-col w-full pt-3">
      <section className="flex items-center justify-between pt-3 pb-6">
        <div className="flex flex-col min-w-0">
          <span className="text-[11px] font-semibold text-faint uppercase tracking-wider">Mastery Journal</span>
          <h1 className="text-[26px] font-bold text-gray-900 tracking-tight mt-0.5 truncate">
            {profile.name ? `${profile.name} 골퍼` : '나의 골프'}
          </h1>
        </div>
        <Link
          to="/records/new"
          className="inline-flex items-center gap-1.5 bg-brand text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm active:scale-95 transition-all shrink-0"
        >
          <Icon name="add" className="text-[17px]" />
          <span>기록 추가</span>
        </Link>
      </section>

      <section className="mb-7">
        <SectionHeader label="Personal Best" right="역대 최고 기록" />
        <MetricTriple items={metrics} />
      </section>

      <section className="flex flex-col">
        <SectionHeader label="Recent Activity" right={recent.length > 0 ? `최근 ${recent.length}회 기록` : null} />
        {recent.length === 0 ? (
          <EmptyState
            title="아직 기록이 없습니다"
            description="스크린, 필드, 연습 기록을 남기면 최고 기록이 자동으로 계산됩니다."
            actionLabel="첫 기록 추가"
            actionTo="/records/new"
          />
        ) : (
          <>
            <div className="flex flex-col bg-white rounded-2xl border border-hairline overflow-hidden divide-y divide-hairline shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
              {recent.map((entry) => (
                <RecentRecordRow key={entry.key} entry={entry} />
              ))}
            </div>
            <div className="flex justify-center pt-5">
              <Link
                to="/journal"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:opacity-80 py-2 px-3 transition-opacity"
              >
                <span>전체 일지 보기</span>
                <Icon name="arrow_forward" className="text-[15px]" />
              </Link>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
