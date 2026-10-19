import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SubPageLayout from '../components/layout/SubPageLayout';
import { FormField, NumberInput, PrimaryButton, Segmented, SelectInput, Stepper } from '../components/form/controls';
import { useData } from '../data/DataProvider';
import { CLUBS, DRIVER, parFor } from '../domain/golf';
import { goalCurrentValue } from '../domain/goals';
import { validateGoal } from '../domain/validation';

const sameCategory = (a, b) =>
  a.type === b.type &&
  (a.type === 'score' ? a.round_type === b.round_type && Number(a.holes) === Number(b.holes) : a.club === b.club);

export default function GoalFormPage() {
  const navigate = useNavigate();
  const { goal, rounds, practices, saveGoal, updateGoal } = useData();
  const [form, setForm] = useState(() => ({
    type: goal?.type ?? 'score',
    round_type: goal?.round_type ?? 'field',
    holes: String(goal?.holes ?? 18),
    club: goal?.club ?? DRIVER,
    target_value: goal ? String(goal.target_value) : '',
  }));
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const set = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }));
  const candidate = { ...form, holes: Number(form.holes) };
  const current = goalCurrentValue(candidate, rounds, practices);
  const errors = validateGoal(form);
  const shownErrors = submitted ? errors : {};
  const isScore = form.type === 'score';
  const holes = Number(form.holes);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    setSaving(true);
    try {
      // 같은 항목의 목표값만 바꾸면 시작점을 유지하고, 항목이 바뀌면 지금의 최고 기록을 새 시작점으로 둔다.
      if (goal && sameCategory(goal, candidate)) {
        await updateGoal(goal.id, { ...candidate, baseline_value: goal.baseline_value });
      } else {
        await saveGoal({ ...candidate, baseline_value: current });
      }
      navigate('/my', { replace: true });
    } catch (error) {
      setSaveError(error.message || '저장하지 못했습니다.');
      setSaving(false);
    }
  };

  return (
    <SubPageLayout
      title={goal ? '목표 수정' : '목표 설정'}
      fallback="/my"
      footer={
        <>
          {saveError && <p className="text-[12px] text-danger mb-2 text-center">{saveError}</p>}
          <PrimaryButton type="submit" form="goal-form" disabled={saving}>
            {saving ? '저장 중…' : '저장'}
          </PrimaryButton>
        </>
      }
    >
      <form id="goal-form" noValidate onSubmit={handleSubmit} className="flex flex-col gap-6 pt-5">
        <Segmented
          ariaLabel="목표 종류"
          size="lg"
          value={form.type}
          onChange={set('type')}
          options={[
            { value: 'score', label: '스코어' },
            { value: 'distance', label: '비거리' },
          ]}
        />

        {isScore ? (
          <>
            <FormField label="라운드 종류">
              <Segmented
                ariaLabel="라운드 종류"
                value={form.round_type}
                onChange={set('round_type')}
                options={[
                  { value: 'field', label: '필드' },
                  { value: 'screen', label: '스크린' },
                ]}
              />
            </FormField>
            <FormField label="홀">
              <Segmented
                ariaLabel="홀 수"
                value={form.holes}
                onChange={set('holes')}
                options={[
                  { value: '18', label: '18홀' },
                  { value: '9', label: '9홀' },
                ]}
              />
            </FormField>
            <FormField
              label="목표 타수 (이하)"
              htmlFor="target_value"
              error={shownErrors.target_value}
              hint={current != null ? `현재 최고 기록 ${current}타` : '아직 이 항목의 기록이 없습니다.'}
            >
              <Stepper
                id="target_value"
                value={form.target_value}
                onChange={set('target_value')}
                min={holes}
                max={holes * 10}
                start={current != null ? current - 1 : parFor(holes) + (holes === 18 ? 18 : 9)}
                unit="타"
                invalid={Boolean(shownErrors.target_value)}
              />
            </FormField>
          </>
        ) : (
          <>
            <FormField label="클럽">
              <SelectInput aria-label="클럽" value={form.club} onChange={(event) => set('club')(event.target.value)}>
                {CLUBS.map((club) => (
                  <option key={club} value={club}>
                    {club}
                  </option>
                ))}
              </SelectInput>
            </FormField>
            <FormField
              label="목표 비거리 (이상)"
              htmlFor="target_value"
              error={shownErrors.target_value}
              hint={current != null ? `현재 최고 기록 ${current}m` : '아직 이 클럽의 기록이 없습니다.'}
            >
              <NumberInput
                id="target_value"
                value={form.target_value}
                onChange={set('target_value')}
                unit="m"
                placeholder="0"
                invalid={Boolean(shownErrors.target_value)}
              />
            </FormField>
          </>
        )}
      </form>
    </SubPageLayout>
  );
}
