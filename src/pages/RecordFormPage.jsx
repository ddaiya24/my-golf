import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon';
import SubPageLayout from '../components/layout/SubPageLayout';
import EmptyState from '../components/ui/EmptyState';
import {
  DateInput,
  FormField,
  NumberInput,
  PrimaryButton,
  Segmented,
  SelectInput,
  Stepper,
  TextArea,
  TextInput,
} from '../components/form/controls';
import { useData } from '../data/DataProvider';
import { CLUBS, parFor } from '../domain/golf';
import { validatePractice, validateRound } from '../domain/validation';
import { isValidISODate, todayISO } from '../utils/date';
import { createId } from '../utils/id';

const TYPE_OPTIONS = [
  { value: 'screen', label: '스크린' },
  { value: 'field', label: '필드' },
  { value: 'practice', label: '연습' },
];

const HOLE_OPTIONS = [
  { value: '18', label: '18홀' },
  { value: '9', label: '9홀' },
];

const str = (value) => (value == null ? '' : String(value));

function roundToForm(round) {
  return {
    course_name: str(round.course_name),
    venue_name: str(round.venue_name),
    holes: str(round.holes),
    total_strokes: str(round.total_strokes),
    birdies: str(round.birdies),
    putts: str(round.putts),
    driver_max_m: str(round.driver_max_m),
    memo: str(round.memo),
  };
}

const EMPTY_ROUND = {
  course_name: '',
  venue_name: '',
  holes: '18',
  total_strokes: '',
  birdies: '',
  putts: '',
  driver_max_m: '',
  memo: '',
};

const newClub = (club) => ({ key: createId(), club, max_distance_m: '', avg_distance_m: '' });

function practiceToForm(session) {
  return {
    venue_name: str(session.venue_name),
    memo: str(session.memo),
    clubs: session.clubs.map((club) => ({
      key: club.id,
      club: club.club,
      max_distance_m: str(club.max_distance_m),
      avg_distance_m: str(club.avg_distance_m),
    })),
  };
}

export default function RecordFormPage() {
  const { kind: editKind, id: editId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const data = useData();
  const isEdit = Boolean(editId);

  const editing = useMemo(() => {
    if (!isEdit) return null;
    if (editKind === 'round') return data.rounds.find((round) => round.id === editId) ?? null;
    if (editKind === 'practice') return data.practices.find((session) => session.id === editId) ?? null;
    return null;
    // 수정 화면에 들어올 때의 값으로만 폼을 채운다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initialType = isEdit
    ? editKind === 'practice'
      ? 'practice'
      : editing?.type
    : TYPE_OPTIONS.some((t) => t.value === params.get('type'))
      ? params.get('type')
      : 'screen';
  const initialDate = editing?.date ?? (isValidISODate(params.get('date')) ? params.get('date') : todayISO());

  const [type, setType] = useState(initialType);
  const [date, setDate] = useState(initialDate);
  const [round, setRound] = useState(editing && editKind === 'round' ? roundToForm(editing) : EMPTY_ROUND);
  const [practice, setPractice] = useState(
    editing && editKind === 'practice' ? practiceToForm(editing) : { venue_name: '', memo: '', clubs: [newClub(CLUBS[0])] },
  );
  const [detailsOpen, setDetailsOpen] = useState(
    Boolean(editing && editKind === 'round' && (editing.birdies != null || editing.putts != null || editing.driver_max_m != null || editing.memo || (editing.type === 'screen' && editing.course_name))),
  );
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  if (isEdit && !editing) {
    return (
      <SubPageLayout title="기록 수정" fallback="/journal">
        <div className="pt-8">
          <EmptyState title="기록을 찾을 수 없습니다" description="삭제되었거나 잘못된 주소입니다." actionLabel="일지로 이동" actionTo="/journal" />
        </div>
      </SubPageLayout>
    );
  }

  const isPractice = type === 'practice';
  const roundInput = { ...round, type, date };
  const practiceInput = { ...practice, date };
  const errors = isPractice ? validatePractice(practiceInput) : validateRound(roundInput);
  const shownErrors = submitted ? errors : {};

  const setRoundField = (field) => (value) => setRound((prev) => ({ ...prev, [field]: value }));
  const setClub = (key, patch) =>
    setPractice((prev) => ({ ...prev, clubs: prev.clubs.map((club) => (club.key === key ? { ...club, ...patch } : club)) }));
  const usedClubs = new Set(practice.clubs.map((club) => club.club));
  const nextClub = CLUBS.find((club) => !usedClubs.has(club));

  const holes = Number(round.holes);
  const nameField = type === 'field' ? 'course_name' : 'venue_name';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length > 0) {
      requestAnimationFrame(() => {
        document.querySelector('[data-invalid="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      let saved;
      if (isPractice) {
        saved = isEdit ? await data.updatePractice(editId, practiceInput) : await data.createPractice(practiceInput);
      } else {
        // 필드 기록에는 매장 이름을 쓰지 않는다.
        const input = type === 'field' ? { ...roundInput, venue_name: null } : roundInput;
        saved = isEdit ? await data.updateRound(editId, input) : await data.createRound(input);
      }
      navigate(`/records/${isPractice ? 'practice' : 'round'}/${saved.id}`, { replace: true });
    } catch (error) {
      setSaveError(error.message || '저장하지 못했습니다.');
      setSaving(false);
    }
  };

  return (
    <SubPageLayout
      title={isEdit ? '기록 수정' : '기록 추가'}
      fallback="/journal"
      footer={
        <>
          {saveError && <p className="text-[12px] text-danger mb-2 text-center">{saveError}</p>}
          <PrimaryButton type="submit" form="record-form" disabled={saving}>
            {saving ? '저장 중…' : '저장'}
          </PrimaryButton>
        </>
      }
    >
      <form id="record-form" noValidate onSubmit={handleSubmit} className="flex flex-col gap-6 pt-5">
        {(!isEdit || !isPractice) && (
          <Segmented
            ariaLabel="기록 종류"
            size="lg"
            value={type}
            onChange={setType}
            options={isEdit ? TYPE_OPTIONS.filter((option) => option.value !== 'practice') : TYPE_OPTIONS}
          />
        )}

        <div data-invalid={Boolean(shownErrors.date)}>
          <FormField label="날짜" htmlFor="date" error={shownErrors.date}>
            <DateInput id="date" value={date} max={todayISO()} onChange={(event) => setDate(event.target.value)} invalid={Boolean(shownErrors.date)} />
          </FormField>
        </div>

        {!isPractice ? (
          <>
            <div data-invalid={Boolean(shownErrors[nameField])}>
              <FormField label={type === 'field' ? '골프장 이름' : '매장 이름'} htmlFor={nameField} error={shownErrors[nameField]}>
                <TextInput
                  id={nameField}
                  value={round[nameField]}
                  onChange={(event) => setRoundField(nameField)(event.target.value)}
                  placeholder={type === 'field' ? '예: 사우스스프링스 CC' : '예: 골프존파크 강남점'}
                  maxLength={40}
                  invalid={Boolean(shownErrors[nameField])}
                />
              </FormField>
            </div>

            <FormField label="홀">
              <Segmented ariaLabel="홀 수" value={round.holes} onChange={setRoundField('holes')} options={HOLE_OPTIONS} />
            </FormField>

            <div data-invalid={Boolean(shownErrors.total_strokes)}>
              <FormField label="총타수" htmlFor="total_strokes" error={shownErrors.total_strokes} hint={`파 ${parFor(holes)} 기준`}>
                <Stepper
                  id="total_strokes"
                  value={round.total_strokes}
                  onChange={setRoundField('total_strokes')}
                  min={holes}
                  max={holes * 10}
                  start={parFor(holes)}
                  unit="타"
                  invalid={Boolean(shownErrors.total_strokes)}
                />
              </FormField>
            </div>

            <div className="flex flex-col border-t border-hairline pt-2">
              <button
                type="button"
                onClick={() => setDetailsOpen((open) => !open)}
                aria-expanded={detailsOpen}
                className="flex items-center justify-between h-12 text-[14px] font-semibold text-brand"
              >
                <span>상세 기록 추가</span>
                <Icon name={detailsOpen ? 'expand_less' : 'expand_more'} className="text-[22px]" />
              </button>
              {detailsOpen && (
                <div className="flex flex-col gap-6 pt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div data-invalid={Boolean(shownErrors.birdies)}>
                      <FormField label="버디 수" htmlFor="birdies" error={shownErrors.birdies}>
                        <NumberInput id="birdies" value={round.birdies} onChange={setRoundField('birdies')} unit="개" placeholder="0" invalid={Boolean(shownErrors.birdies)} />
                      </FormField>
                    </div>
                    <div data-invalid={Boolean(shownErrors.putts)}>
                      <FormField label="퍼트 수" htmlFor="putts" error={shownErrors.putts}>
                        <NumberInput id="putts" value={round.putts} onChange={setRoundField('putts')} unit="개" placeholder="0" invalid={Boolean(shownErrors.putts)} />
                      </FormField>
                    </div>
                  </div>
                  <div data-invalid={Boolean(shownErrors.driver_max_m)}>
                    <FormField label="드라이버 최고 비거리" htmlFor="driver_max_m" error={shownErrors.driver_max_m}>
                      <NumberInput id="driver_max_m" value={round.driver_max_m} onChange={setRoundField('driver_max_m')} unit="m" placeholder="0" invalid={Boolean(shownErrors.driver_max_m)} />
                    </FormField>
                  </div>
                  {type === 'screen' && (
                    <FormField label="코스 이름 (선택)" htmlFor="course_name">
                      <TextInput id="course_name" value={round.course_name} onChange={(event) => setRoundField('course_name')(event.target.value)} placeholder="스크린에서 플레이한 코스" maxLength={40} />
                    </FormField>
                  )}
                  <FormField label="메모" htmlFor="memo">
                    <TextArea id="memo" value={round.memo} onChange={(event) => setRoundField('memo')(event.target.value)} maxLength={500} />
                  </FormField>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <FormField label="연습장 이름 (선택)" htmlFor="practice_venue">
              <TextInput
                id="practice_venue"
                value={practice.venue_name}
                onChange={(event) => setPractice((prev) => ({ ...prev, venue_name: event.target.value }))}
                placeholder="예: 쇼골프 김포공항점"
                maxLength={40}
              />
            </FormField>

            <div className="flex flex-col">
              <span className="text-[13px] font-medium text-muted mb-1.5 px-0.5">클럽별 비거리</span>
              <div className="flex flex-col bg-white rounded-2xl border border-hairline divide-y divide-hairline">
                {practice.clubs.map((club, index) => {
                  const clubError = shownErrors[`clubs.${index}.club`];
                  const maxError = shownErrors[`clubs.${index}.max_distance_m`];
                  const avgError = shownErrors[`clubs.${index}.avg_distance_m`];
                  return (
                    <div key={club.key} className="flex flex-col gap-3 p-4" data-invalid={Boolean(clubError || maxError || avgError)}>
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <FormField error={clubError}>
                            <SelectInput aria-label="클럽" value={club.club} onChange={(event) => setClub(club.key, { club: event.target.value })} invalid={Boolean(clubError)}>
                              {CLUBS.map((name) => (
                                <option key={name} value={name}>
                                  {name}
                                </option>
                              ))}
                            </SelectInput>
                          </FormField>
                        </div>
                        {practice.clubs.length > 1 && (
                          <button
                            type="button"
                            aria-label={`${club.club} 삭제`}
                            onClick={() => setPractice((prev) => ({ ...prev, clubs: prev.clubs.filter((item) => item.key !== club.key) }))}
                            className="w-12 h-12 shrink-0 flex items-center justify-center text-faint"
                          >
                            <Icon name="close" className="text-[20px]" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <FormField label="최고 비거리" htmlFor={`max-${club.key}`} error={maxError}>
                          <NumberInput id={`max-${club.key}`} value={club.max_distance_m} onChange={(value) => setClub(club.key, { max_distance_m: value })} unit="m" placeholder="0" invalid={Boolean(maxError)} />
                        </FormField>
                        <FormField label="평균 (선택)" htmlFor={`avg-${club.key}`} error={avgError}>
                          <NumberInput id={`avg-${club.key}`} value={club.avg_distance_m} onChange={(value) => setClub(club.key, { avg_distance_m: value })} unit="m" placeholder="0" invalid={Boolean(avgError)} />
                        </FormField>
                      </div>
                    </div>
                  );
                })}
              </div>
              {nextClub && (
                <button
                  type="button"
                  onClick={() => setPractice((prev) => ({ ...prev, clubs: [...prev.clubs, newClub(nextClub)] }))}
                  className="self-start inline-flex items-center gap-1 mt-2 h-11 px-1 text-[14px] font-semibold text-brand"
                >
                  <Icon name="add" className="text-[18px]" />
                  <span>클럽 추가</span>
                </button>
              )}
            </div>

            <FormField label="메모 (선택)" htmlFor="practice_memo">
              <TextArea id="practice_memo" value={practice.memo} onChange={(event) => setPractice((prev) => ({ ...prev, memo: event.target.value }))} maxLength={500} />
            </FormField>
          </>
        )}
      </form>
    </SubPageLayout>
  );
}
