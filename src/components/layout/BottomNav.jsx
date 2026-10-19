import { NavLink } from 'react-router-dom';
import Icon from '../Icon';

const TABS = [
  { to: '/', label: '홈', icon: 'roofing', end: true },
  { to: '/journal', label: '일지', icon: 'history_edu' },
  { to: '/growth', label: '성장', icon: 'insights' },
  { to: '/my', label: 'MY', icon: 'account_circle' },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 pb-safe bg-white/95 backdrop-blur-md border-t border-hairline">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-5">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center min-w-[52px] min-h-[44px] gap-0.5 transition-colors ${
                isActive ? 'text-brand-deep' : 'text-faint hover:text-ink'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon name={tab.icon} fill={isActive} className="text-[22px]" />
                <span className={`text-[11px] tracking-tight ${isActive ? 'font-semibold' : 'font-medium'}`}>
                  {tab.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
