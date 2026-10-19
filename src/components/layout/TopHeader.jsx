import { Link } from 'react-router-dom';
import Icon from '../Icon';

export default function TopHeader() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-b border-hairline pt-safe">
      <div className="h-14 px-5 md:px-6 max-w-xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center" aria-label="홈으로">
          <span className="font-brand italic font-semibold text-[24px] tracking-tight text-brand-deep select-none">
            my golf.
          </span>
        </Link>
        <Link
          to="/my"
          aria-label="MY"
          className="w-8 h-8 rounded-full bg-brand-deep flex items-center justify-center shrink-0 shadow-sm"
        >
          <Icon name="person" className="text-white text-[18px]" />
        </Link>
      </div>
    </header>
  );
}
