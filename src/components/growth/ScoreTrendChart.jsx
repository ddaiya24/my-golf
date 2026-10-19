import { CartesianGrid, LabelList, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatToPar, toPar } from '../../domain/golf';
import { formatMonthDay } from '../../utils/date';

// Stitch apple_style_3의 SVG 그래프 값을 그대로 쓴다.
const BRAND = '#123F32';
const LABEL = '#475569';
const AXIS = '#94a3b8';
const GRID = '#f1f5f9';
const GOAL = '#d97706';
const FONT = 'Inter, "Pretendard Variable", Pretendard, sans-serif';

// 점이 많으면 모든 점에 숫자를 붙이지 않고 베스트·최근 기록만 표시한다.
const LABEL_ALL_MAX = 6;

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="bg-white border border-hairline rounded-lg px-3 py-2 shadow-[0_4px_20px_-2px_rgba(18,63,50,0.08)]">
      <p className="text-[11px] text-faint">
        {formatMonthDay(point.date)} · {point.title}
      </p>
      <p className="text-[14px] font-semibold text-ink tabular-nums mt-0.5">
        {point.strokes}타 <span className="text-[12px] font-medium text-muted">{formatToPar(toPar(point.strokes, point.holes))}</span>
      </p>
    </div>
  );
}

export default function ScoreTrendChart({ rounds, overallBest, goalTarget }) {
  const bestId = rounds.reduce((best, round) => (!best || round.total_strokes < best.total_strokes ? round : best), null)?.id;
  const data = rounds.map((round, index) => ({
    label: `${index + 1}R`,
    strokes: round.total_strokes,
    holes: round.holes,
    date: round.date,
    title: round.title,
    isBest: round.id === bestId,
    isLast: index === rounds.length - 1,
  }));
  const values = data.map((point) => point.strokes);
  const lo = Math.min(...values, goalTarget ?? Infinity) - 3;
  const hi = Math.max(...values) + 3;
  const labelAll = data.length <= LABEL_ALL_MAX;

  const renderDot = ({ cx, cy, index, payload }) => {
    if (cx == null || cy == null) return <g key={`dot-${index}`} />;
    if (payload.isBest) {
      return (
        <g key={`dot-${index}`}>
          <circle cx={cx} cy={cy} r={7} fill={BRAND} />
          <circle cx={cx} cy={cy} r={3.5} fill="#ffffff" />
        </g>
      );
    }
    return <circle key={`dot-${index}`} cx={cx} cy={cy} r={4.5} fill="#ffffff" stroke={BRAND} strokeWidth={2} />;
  };

  const renderLabel = ({ x, y, index }) => {
    const point = data[index];
    if (!point || x == null || y == null) return null;
    if (point.isBest) {
      const text = point.strokes === overallBest ? `${point.strokes} 라베` : `${point.strokes}`;
      const width = text.length > 3 ? 48 : 30;
      return (
        <g>
          <rect x={x - width / 2} y={y - 31} width={width} height={18} rx={4} fill={BRAND} />
          <text x={x} y={y - 18} textAnchor="middle" fill="#ffffff" fontSize={11} fontWeight={700} fontFamily={FONT}>
            {text}
          </text>
        </g>
      );
    }
    if (!labelAll && !point.isLast) return null;
    return (
      <text x={x} y={y - 14} textAnchor="middle" fill={LABEL} fontSize={12} fontWeight={600} fontFamily={FONT}>
        {point.strokes}
      </text>
    );
  };

  const renderTick = ({ x, y, payload, index }) => {
    const isLast = index === data.length - 1;
    return (
      <text
        x={x}
        y={y + 12}
        textAnchor="middle"
        fontSize={11}
        fontFamily={FONT}
        fill={isLast ? BRAND : AXIS}
        fontWeight={isLast ? 700 : 400}
      >
        {payload.value}
      </text>
    );
  };

  return (
    <div className="w-full h-44" role="img" aria-label={`스코어 추이: ${values.join(', ')}타`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 34, right: 26, bottom: 0, left: 26 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={renderTick} interval="preserveStartEnd" minTickGap={8} />
          <YAxis hide domain={[lo, hi]} />
          {goalTarget != null && (
            <ReferenceLine y={goalTarget} stroke={GOAL} strokeDasharray="4 4" strokeWidth={1.5} strokeOpacity={0.8} ifOverflow="extendDomain" />
          )}
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#e8ece8', strokeWidth: 1 }} />
          <Line
            type="linear"
            dataKey="strokes"
            stroke={BRAND}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={renderDot}
            activeDot={{ r: 6, fill: BRAND, stroke: '#ffffff', strokeWidth: 2 }}
            isAnimationActive={false}
          >
            <LabelList dataKey="strokes" content={renderLabel} />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
