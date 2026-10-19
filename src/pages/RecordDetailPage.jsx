import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import SubPageLayout from '../components/layout/SubPageLayout';
import MetricTriple from '../components/ui/MetricTriple';
import SectionHeader from '../components/ui/SectionHeader';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useData } from '../data/DataProvider';
import { DRIVER, TYPE_LABEL, formatToPar, practiceTitle, practiceTopClub, roundTitle, toPar } from '../domain/golf';
import { isCategoryBest } from '../domain/stats';
import { formatFullDate } from '../utils/date';

function InfoRow({ label, value, unit }) {
  return (
    <div className="flex items-center justify-between min-h-14 px-4">
      <span className="text-[14px] text-muted">{label}</span>
      {value == null ? (
        <span className="text-[14px] text-gray-300">–</span>
      ) : (
        <span className="text-[16px] font-semibold text-ink tabular-nums">
          {value}
          {unit && <span className="text-[12px] font-normal text-faint ml-0.5">{unit}</span>}
        </span>
      )}
    </div>
  );
}

function Memo({ text }) {
  if (!text) return null;
  return (
    <section className="mt-7">
      <SectionHeader label="Memo" right="메모" />
      <p className="text-[14px] text-ink leading-relaxed whitespace-pre-wrap break-words bg-fill rounded-2xl p-4">{text}</p>
    </section>
  );
}

function RoundDetail({ round, rounds }) {
  const diff = toPar(round.total_strokes, round.holes);
  const best = isCategoryBest(round, rounds);
  return (
    <>
      <MetricTriple
        items={[
          { label: '총타수', value: round.total_strokes, unit: '타', sub: best ? '라베' : null, subTone: 'gold' },
          { label: '파 대비', value: formatToPar(diff), sub: `파 ${round.total_strokes - diff}`, subTone: diff > 0 ? 'gold' : 'brand', valueTone: diff > 0 ? 'ink' : 'brand' },
          { label: '홀', value: round.holes, unit: '홀', sub: TYPE_LABEL[round.type] },
        ]}
      />
      <section className="mt-7">
        <SectionHeader label="Details" right="상세 기록" />
        <div className="flex flex-col bg-white rounded-2xl border border-hairline divide-y divide-hairline">
          {round.type === 'screen' && round.course_name && (
            <div className="flex items-center justify-between gap-4 min-h-14 px-4">
              <span className="text-[14px] text-muted shrink-0">코스</span>
              <span className="text-[15px] font-semibold text-ink truncate">{round.course_name}</span>
            </div>
          )}
          <InfoRow label="버디" value={round.birdies} unit="개" />
          <InfoRow label="퍼트" value={round.putts} unit="개" />
          <InfoRow label="드라이버 최고 비거리" value={round.driver_max_m} unit="m" />
        </div>
      </section>
      <Memo text={round.memo} />
    </>
  );
}

function PracticeDetail({ session }) {
  const top = practiceTopClub(session);
  const driver = session.clubs.find((club) => club.club === DRIVER);
  return (
    <>
      <MetricTriple
        items={[
          { label: '최장 비거리', value: top?.max_distance_m ?? null, unit: 'm', sub: top?.club, subTone: 'gold' },
          { label: '클럽', value: session.clubs.length, unit: '개', sub: '연습한 클럽' },
          {
            label: '드라이버',
            value: driver?.max_distance_m ?? null,
            unit: 'm',
            sub: driver ? (driver.avg_distance_m != null ? `평균 ${driver.avg_distance_m}m` : '최고') : '기록 없음',
          },
        ]}
      />
      <section className="mt-7">
        <SectionHeader label="Clubs" right="클럽별 비거리" />
        <div className="flex flex-col bg-white rounded-2xl border border-hairline divide-y divide-hairline">
          {session.clubs.map((club) => (
            <div key={club.id} className="flex items-center justify-between min-h-14 px-4 gap-3">
              <span className="text-[15px] font-semibold text-ink truncate">{club.club}</span>
              <div className="flex items-baseline gap-3 shrink-0 tabular-nums">
                {club.avg_distance_m != null && (
                  <span className="text-[12px] text-faint">
                    평균 {club.avg_distance_m}
                    <span className="ml-0.5">m</span>
                  </span>
                )}
                <span className="text-[16px] font-semibold text-ink">
                  {club.max_distance_m}
                  <span className="text-[12px] font-normal text-faint ml-0.5">m</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
      <Memo text={session.memo} />
    </>
  );
}

export default function RecordDetailPage() {
  const { kind, id } = useParams();
  const navigate = useNavigate();
  const { rounds, practices, deleteRound, deletePractice } = useData();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const closeConfirm = useCallback(() => setConfirmOpen(false), []);

  const round = kind === 'round' ? rounds.find((item) => item.id === id) : null;
  const session = kind === 'practice' ? practices.find((item) => item.id === id) : null;
  const record = round ?? session;

  if (!record) {
    // 삭제 직후에는 일지로 이동하는 중이므로 빈 화면을 잠깐 그린다.
    return (
      <SubPageLayout title="기록" fallback="/journal">
        {!deleting && (
          <div className="pt-8">
            <EmptyState title="기록을 찾을 수 없습니다" description="삭제되었거나 잘못된 주소입니다." actionLabel="일지로 이동" actionTo="/journal" />
          </div>
        )}
      </SubPageLayout>
    );
  }

  const typeKey = round ? round.type : 'practice';
  const title = round ? roundTitle(round) : practiceTitle(session);
  const tag = round ? `${TYPE_LABEL[round.type]} ${round.holes}홀` : '연습장';

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      if (round) await deleteRound(id);
      else await deletePractice(id);
      navigate('/journal', { replace: true });
    } catch (err) {
      setDeleting(false);
      setConfirmOpen(false);
      setError(err.message || '삭제하지 못했습니다.');
    }
  };

  return (
    <SubPageLayout title={`${TYPE_LABEL[typeKey]} 기록`} fallback="/journal">
      <section className="flex flex-col pt-5 pb-6">
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] text-faint font-medium">{formatFullDate(record.date)}</span>
          <span className="w-1 h-1 rounded-full bg-[#d0d7d4]" />
          <span className={`px-2 py-0.5 rounded text-[11px] font-medium bg-subtle ${typeKey === 'field' ? 'text-brand' : 'text-muted'}`}>
            {tag}
          </span>
        </div>
        <h1 className="text-[26px] font-bold text-ink tracking-tight mt-1.5 break-words">{title}</h1>
      </section>

      {round ? <RoundDetail round={round} rounds={rounds} /> : <PracticeDetail session={session} />}

      {error && <p className="text-[13px] text-danger mt-6 text-center">{error}</p>}

      <div className="grid grid-cols-2 gap-2.5 mt-8">
        <Link
          to={`/records/${kind}/${id}/edit`}
          className="h-[50px] rounded-xl bg-fill border border-hairline text-ink text-[15px] font-semibold flex items-center justify-center active:scale-[0.98] transition-all"
        >
          수정
        </Link>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="h-[50px] rounded-xl bg-white border border-hairline text-danger text-[15px] font-semibold active:scale-[0.98] transition-all"
        >
          삭제
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="이 기록을 삭제할까요?"
        message="삭제한 기록은 되돌릴 수 없으며, 최고 기록과 통계도 다시 계산됩니다."
        busy={deleting}
        onCancel={closeConfirm}
        onConfirm={handleDelete}
      />
    </SubPageLayout>
  );
}
