import { useNavigate } from 'react-router-dom';
import Icon from '../Icon';

/** 상세·입력 화면용 레이아웃: 뒤로가기 헤더, 하단 탭 없음, 선택적으로 하단 고정 버튼 영역 */
export default function SubPageLayout({ title, fallback = '/', footer, children }) {
  const navigate = useNavigate();

  const goBack = () => {
    // 앱 안에서 이동해 온 경우에만 뒤로 가고, 주소로 바로 들어온 경우에는 fallback으로 보낸다.
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate(fallback, { replace: true });
  };

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-b border-hairline pt-safe">
        <div className="relative h-14 px-2 max-w-xl mx-auto flex items-center">
          <button
            type="button"
            onClick={goBack}
            aria-label="뒤로"
            className="w-11 h-11 flex items-center justify-center text-ink"
          >
            <Icon name="arrow_back_ios_new" className="text-[20px]" />
          </button>
          <h1 className="absolute left-1/2 -translate-x-1/2 text-[16px] font-semibold tracking-tight text-ink">
            {title}
          </h1>
        </div>
      </header>
      <main
        className={`relative w-full min-h-dvh bg-white pt-[calc(3.5rem+env(safe-area-inset-top))] ${
          footer ? 'pb-[calc(6.5rem+env(safe-area-inset-bottom))]' : 'pb-[calc(2.5rem+env(safe-area-inset-bottom))]'
        }`}
      >
        <div className="w-full max-w-xl mx-auto px-5 md:px-6">{children}</div>
      </main>
      {footer && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-hairline pb-safe">
          <div className="max-w-xl mx-auto px-5 md:px-6 py-3">{footer}</div>
        </div>
      )}
    </>
  );
}
