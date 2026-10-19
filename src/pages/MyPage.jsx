import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import SectionHeader from '../components/ui/SectionHeader';
import MetricTriple from '../components/ui/MetricTriple';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useData } from '../data/DataProvider';
import { TYPE_LABEL, formatToPar, toPar } from '../domain/golf';
import { sortOldestFirst, toEntries } from '../domain/entries';
import { categoryBest, clubBests, lifetimeCounts, preferredBest } from '../domain/stats';
import { goalDescription, goalProgress, goalTitle, goalUnit } from '../domain/goals';
import { computeAchievements } from '../domain/achievements';
import { formatYearMonthDot } from '../utils/date';

const cardClass = 'bg-white rounded-xl border border-hairline shadow-[0_1px_3px_rgba(0,0,0,0.02)]';

function ProfileHeader({ name, entries, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name ?? '');
  const [error, setError] = useState(null);
  const first = entries[0];

  const save = async (event) => {
    event.preventDefault();
    try {
      await onSave({ name: draft });
      setEditing(false);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex items-center gap-4 pt-5 pb-6 border-b border-[#f0f3f0]">
      <div className="w-[70px] h-[70px] rounded-full bg-[#f6f7f6] ring-1 ring-black/5 flex items-center justify-center shrink-0">
        <Icon name="person" className="text-[34px] text-brand-deep" />
      </div>
      {editing ? (
        <form onSubmit={save} className="flex flex-col flex-1 min-w-0 gap-2">
          <input
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={12}
            placeholder="이름"
            aria-label="이름"
            className="w-full h-11 px-3 rounded-xl bg-fill border-[1.5px] border-transparent text-[16px] outline-none focus:bg-white focus:border-brand"
          />
          <div className="flex items-center gap-1">
            <button type="submit" className="h-9 px-3 rounded-lg bg-brand text-white text-[13px] font-semibold">
              저장
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(name ?? '');
                setEditing(false);
              }}
              className="h-9 px-3 text-[13px] font-medium text-muted"
            >
              취소
            </button>
          </div>
          {error && <p className="text-[12px] text-danger">{error}</p>}
        </form>
      ) : (
        <div className="flex flex-col min-w-0">
          <span className={`text-[20px] font-semibold tracking-tight truncate ${name ? 'text-[#111814]' : 'text-faint'}`}>
            {name ?? '이름 없음'}
          </span>
          <p className="text-[13px] text-muted mt-0.5">
            {first ? `첫 기록 ${first.date.replaceAll('-', '.')} · 총 ${entries.length}개 기록` : '아직 기록이 없습니다'}
          </p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="self-start flex items-center gap-1 mt-1.5 text-gold text-[12px] font-medium"
          >
            <Icon name="edit" className="text-[14px]" />
            <span>{name ? '이름 수정' : '이름 설정'}</span>
          </button>
        </div>
      )}
    </div>
  );
}

function PersonalRecords({ rounds, practices }) {
  const scoreRows = ['field', 'screen'].flatMap((type) =>
    [18, 9].map((holes) => ({ type, holes, best: categoryBest(rounds, type, holes) })).filter((row) => row.best),
  );
  const clubs = clubBests(rounds, practices);
  if (scoreRows.length === 0 && clubs.length === 0) return null;

  return (
    <section className="flex flex-col mb-7">
      <SectionHeader label="Personal Records" right="개인 최고 기록" />
      <div className={`${cardClass} divide-y divide-hairline`}>
        {scoreRows.map(({ type, holes, best }) => (
          <Link key={`${type}-${holes}`} to={`/records/round/${best.id}`} className="flex items-center justify-between min-h-14 px-4 active:bg-gray-50">
            <span className="text-[14px] text-muted">
              {TYPE_LABEL[type]} {holes}홀
            </span>
            <span className="flex items-baseline gap-2 tabular-nums">
              <span className="text-[11px] text-faint">{formatYearMonthDot(best.date)}</span>
              <span className="text-[16px] font-semibold text-ink">
                {best.total_strokes}
                <span className="text-[12px] font-normal text-faint ml-0.5">타</span>
              </span>
            </span>
          </Link>
        ))}
        {clubs.map((club) => (
          <div key={club.club} className="flex items-center justify-between min-h-14 px-4">
            <span className="text-[14px] text-muted">{club.club}</span>
            <span className="flex items-baseline gap-2 tabular-nums">
              <span className="text-[11px] text-faint">{formatYearMonthDot(club.date)}</span>
              <span className="text-[16px] font-semibold text-ink">
                {club.value}
                <span className="text-[12px] font-normal text-faint ml-0.5">m</span>
              </span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function GoalCard({ goal, rounds, practices, onDelete }) {
  if (!goal) {
    return (
      <div className={`${cardClass} p-5 flex items-center justify-between gap-3`}>
        <div className="flex flex-col">
          <h3 className="text-[16px] font-semibold text-[#111814]">설정된 목표가 없습니다</h3>
          <p className="text-[13px] text-muted mt-0.5">스코어 또는 비거리 목표 1개를 정할 수 있습니다.</p>
        </div>
        <Link to="/my/goal" className="shrink-0 inline-flex items-center gap-1 bg-brand text-white px-3.5 py-2 rounded-xl text-xs font-semibold">
          <Icon name="add" className="text-[16px]" />
          목표 설정
        </Link>
      </div>
    );
  }

  const progress = goalProgress(goal, rounds, practices);
  const unit = goalUnit(goal);
  const isScore = goal.type === 'score';
  let status = '기록 없음';
  if (progress.achieved) status = '목표 달성';
  else if (progress.remaining != null) status = isScore ? `${progress.remaining}타 단축 필요` : `${progress.remaining}m 남음`;

  return (
    <div className={`${cardClass} p-5 flex flex-col gap-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-semibold text-gold tracking-wider uppercase">{isScore ? 'Score Goal' : 'Distance Goal'}</span>
          <h3 className="text-[16px] font-semibold text-[#111814] mt-0.5">{goalTitle(goal)}</h3>
          <p className="text-[13px] text-muted mt-0.5">{goalDescription(goal)}</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-[#f4f6f4] flex items-center justify-center shrink-0">
          <Icon name={isScore ? 'sports_score' : 'navigation'} fill={isScore} className="text-[19px] text-brand-deep" />
        </div>
      </div>
      <div className="flex flex-col gap-2 pt-1 border-t border-[#f0f3f0]">
        <div className="flex items-baseline justify-between gap-2 mt-1 flex-wrap">
          <div className="flex items-center gap-1.5 text-[13px]">
            <span className="text-muted">현재 최고 기록</span>
            <span className="text-[15px] font-bold text-brand-deep tabular-nums">{progress.current != null ? `${progress.current}${unit}` : '–'}</span>
          </div>
          <div className="flex items-center gap-1 text-[12px]">
            <span className={`font-medium ${progress.achieved ? 'text-brand' : 'text-gold'}`}>{status}</span>
            <span className="text-faint">·</span>
            <span className="text-brand-deep font-bold tabular-nums">{progress.percent}%</span>
          </div>
        </div>
        <div
          className="w-full h-2 rounded-full bg-[#ecefec] overflow-hidden"
          role="progressbar"
          aria-valuenow={progress.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="목표 진행률"
        >
          <div className="h-full bg-brand-deep rounded-full transition-all duration-700 ease-out" style={{ width: `${progress.percent}%` }} />
        </div>
        <div className="flex justify-between items-center text-faint text-[10px] tracking-tight tabular-nums">
          <span>{progress.start != null ? `START ${progress.start}${unit}` : 'START –'}</span>
          <span>
            TARGET {progress.target}
            {unit}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-end gap-1 -mb-2 -mr-2">
        <Link to="/my/goal" className="h-9 px-3 flex items-center text-[13px] font-medium text-muted">
          수정
        </Link>
        <button type="button" onClick={onDelete} className="h-9 px-3 text-[13px] font-medium text-faint hover:text-danger">
          삭제
        </button>
      </div>
    </div>
  );
}

function AchievementBadge({ achievement }) {
  const { achieved, tone } = achievement;
  const gold = tone === 'gold';
  return (
    <div className={`${cardClass} p-4 flex flex-col justify-between h-[120px] ${achieved ? '' : 'opacity-60'}`}>
      <div className="flex items-center justify-between">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${achieved && gold ? 'bg-[#fbf6ed]' : 'bg-[#f4f6f4]'}`}>
          <Icon
            name={achievement.icon}
            fill={achieved && achievement.icon === 'military_tech'}
            className={`text-[17px] ${!achieved ? 'text-faint' : gold ? 'text-gold' : 'text-brand-deep'}`}
          />
        </div>
        <span className={`text-[10px] font-semibold tracking-wider tabular-nums ${achieved ? 'text-faint' : 'text-faint'}`}>
          {achieved ? formatYearMonthDot(achievement.date) : '미달성'}
        </span>
      </div>
      <div className="min-w-0">
        <h4 className={`text-[14px] font-semibold leading-tight ${achieved ? 'text-[#111814]' : 'text-muted'}`}>{achievement.title}</h4>
        <p className={`text-[11px] mt-1 truncate ${achieved && gold ? 'text-gold font-medium' : 'text-muted'}`}>{achievement.detail}</p>
      </div>
    </div>
  );
}

export default function MyPage() {
  const { rounds, practices, goal, profile, saveProfile, deleteGoal } = useData();
  const [confirmGoalDelete, setConfirmGoalDelete] = useState(false);
  const closeConfirm = useCallback(() => setConfirmGoalDelete(false), []);

  const entries = sortOldestFirst(toEntries(rounds, practices));
  const counts = lifetimeCounts(rounds, practices);
  const best = preferredBest(rounds, 'field') ?? preferredBest(rounds, 'screen');
  const bestDiff = best ? toPar(best.total_strokes, best.holes) : null;
  const achievements = computeAchievements(rounds, practices);
  const achievedCount = achievements.filter((a) => a.achieved).length;

  return (
    <div className="flex flex-col w-full pb-10">
      <ProfileHeader key={profile.name ?? ''} name={profile.name} entries={entries} onSave={saveProfile} />

      <section className="flex flex-col mt-6 mb-7">
        <SectionHeader label="Lifetime Archive" right="누적 통계" />
        <MetricTriple
          align="center"
          items={[
            {
              label: '총 라운드',
              value: counts.rounds,
              unit: '회',
              valueTone: 'brand',
              sub: counts.rounds ? `필드 ${counts.field} · 스크린 ${counts.screen}` : '기록 없음',
            },
            { label: '연습 세션', value: counts.practice, unit: '회', valueTone: 'brand', sub: counts.practice ? '연습장' : '기록 없음' },
            {
              label: '베스트 스코어',
              value: best?.total_strokes ?? null,
              unit: '타',
              valueTone: 'gold',
              sub: best ? `${TYPE_LABEL[best.type]} ${best.holes}H · ${formatToPar(bestDiff)}` : '기록 없음',
              subTone: best ? 'gold' : 'muted',
            },
          ]}
        />
      </section>

      <PersonalRecords rounds={rounds} practices={practices} />

      <section className="flex flex-col mb-7">
        <SectionHeader label="Focus Target" right={goal ? '진행 중인 목표' : '개인 목표'} rightClassName={goal ? 'text-brand font-medium' : 'text-faint'} />
        <GoalCard goal={goal} rounds={rounds} practices={practices} onDelete={() => setConfirmGoalDelete(true)} />
      </section>

      <section className="flex flex-col mb-8">
        <SectionHeader label="Milestones" right={`주요 업적 ${achievedCount}/${achievements.length}`} />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {achievements.map((achievement) => (
            <AchievementBadge key={achievement.id} achievement={achievement} />
          ))}
        </div>
      </section>

      <ConfirmDialog
        open={confirmGoalDelete}
        title="목표를 삭제할까요?"
        message="골프 기록은 그대로 유지됩니다."
        onCancel={closeConfirm}
        onConfirm={async () => {
          await deleteGoal(goal.id);
          setConfirmGoalDelete(false);
        }}
      />
    </div>
  );
}
