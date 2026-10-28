import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { DataProvider, useData } from './data/DataProvider';
import TabLayout from './components/layout/TabLayout';
import StatusScreen from './components/layout/StatusScreen';
import { PrimaryButton, SecondaryButton } from './components/form/controls';
import LoginPage from './pages/LoginPage';
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
  const { status, error, reload } = useData();
  const { signOut } = useAuth();

  if (status === 'loading') return <StatusScreen />;
  if (status === 'error') {
    return (
      <StatusScreen title="데이터를 불러오지 못했습니다" message={error?.message}>
        <PrimaryButton type="button" onClick={reload}>
          다시 시도
        </PrimaryButton>
        <SecondaryButton type="button" onClick={signOut}>
          로그아웃
        </SecondaryButton>
      </StatusScreen>
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

function AuthGate() {
  const { status, user, error, retry } = useAuth();
  if (status === 'loading') return <StatusScreen />;
  if (status === 'error') {
    return (
      <StatusScreen title="연결할 수 없습니다" message={error}>
        <PrimaryButton type="button" onClick={retry}>
          다시 시도
        </PrimaryButton>
      </StatusScreen>
    );
  }
  if (status === 'signedOut') return <LoginPage />;
  // 사용자가 바뀌면 데이터를 처음부터 다시 불러오도록 key를 준다.
  return (
    <DataProvider key={user.id}>
      <AppRoutes />
    </DataProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        <AuthGate />
      </AuthProvider>
    </BrowserRouter>
  );
}
