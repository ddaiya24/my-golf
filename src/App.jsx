import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { DataProvider, useData } from './data/DataProvider';
import TabLayout from './components/layout/TabLayout';
import HomePage from './pages/HomePage';
import JournalPage from './pages/JournalPage';
import MyPage from './pages/MyPage';
import RecordDetailPage from './pages/RecordDetailPage';
import RecordFormPage from './pages/RecordFormPage';
import GoalFormPage from './pages/GoalFormPage';

// 성장 화면만 Recharts를 쓰므로 따로 불러와 첫 로딩을 가볍게 한다.
const GrowthPage = lazy(() => import('./pages/GrowthPage'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// 수정 화면끼리 바로 이동해도 폼이 새 기록으로 다시 채워지도록 key를 준다.
function EditRecordRoute() {
  const { kind, id } = useParams();
  return <RecordFormPage key={`${kind}-${id}`} />;
}

function AppRoutes() {
  const { status, error } = useData();

  if (status === 'loading') return null;
  if (status === 'error') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-8 text-center">
        <span className="font-brand italic font-semibold text-[24px] tracking-tight text-brand-deep">my golf.</span>
        <p className="text-[15px] font-semibold text-ink mt-6">데이터를 불러오지 못했습니다</p>
        <p className="text-[13px] text-muted mt-1.5">{error?.message}</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<TabLayout />}>
        <Route index element={<HomePage />} />
        <Route path="journal" element={<JournalPage />} />
        <Route
          path="growth"
          element={
            <Suspense fallback={null}>
              <GrowthPage />
            </Suspense>
          }
        />
        <Route path="my" element={<MyPage />} />
      </Route>
      <Route path="records/new" element={<RecordFormPage />} />
      <Route path="records/:kind/:id" element={<RecordDetailPage />} />
      <Route path="records/:kind/:id/edit" element={<EditRecordRoute />} />
      <Route path="my/goal" element={<GoalFormPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <DataProvider>
        <ScrollToTop />
        <AppRoutes />
      </DataProvider>
    </BrowserRouter>
  );
}
