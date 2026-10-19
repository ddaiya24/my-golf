import { Link } from 'react-router-dom';
import Icon from '../Icon';

/** 기록이 없을 때의 안내. 장식 없이 문장과 다음 행동 하나만 둔다. */
export default function EmptyState({ title, description, actionLabel, actionTo, bordered = true }) {
  return (
    <div
      className={`flex flex-col items-center text-center px-6 py-10 ${
        bordered ? 'bg-white rounded-2xl border border-hairline' : ''
      }`}
    >
      <p className="text-[15px] font-semibold text-ink tracking-tight">{title}</p>
      {description && <p className="text-[13px] text-muted mt-1.5 leading-relaxed">{description}</p>}
      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="inline-flex items-center gap-1.5 mt-4 text-[13px] font-semibold text-brand py-2 px-3"
        >
          <span>{actionLabel}</span>
          <Icon name="arrow_forward" className="text-[15px]" />
        </Link>
      )}
    </div>
  );
}
