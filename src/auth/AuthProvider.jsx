import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createAuthClient } from '@neondatabase/auth';
import { onUnauthorized } from '../data/api';

// Neon Auth 요청은 앱 도메인의 /api/auth/* 를 거쳐 서버가 프록시한다.
// 세션은 같은 도메인의 HttpOnly 쿠키로 유지되므로 브라우저 공개 환경변수가 필요 없다.
const authClient = createAuthClient(`${window.location.origin}/api/auth`);

const AuthContext = createContext(null);

function authErrorMessage(error, mode) {
  const text = `${error?.code ?? ''} ${error?.message ?? ''}`.toLowerCase();
  const status = error?.status;
  if (status === 0 || text.includes('fetch') || text.includes('network')) return '네트워크에 연결할 수 없습니다. 연결 상태를 확인해 주세요.';
  if (text.includes('already') || text.includes('exist')) return '이미 가입된 이메일입니다. 로그인해 주세요.';
  if (text.includes('password') && (text.includes('short') || text.includes('length'))) return '비밀번호는 8자 이상으로 입력해 주세요.';
  if (text.includes('invalid_email') || (text.includes('email') && text.includes('invalid') && !text.includes('password'))) return '이메일 형식을 확인해 주세요.';
  if (text.includes('rate') || status === 429) return '시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.';
  if (mode === 'signIn' && (status === 401 || text.includes('credential') || text.includes('invalid'))) return '이메일 또는 비밀번호가 올바르지 않습니다.';
  return mode === 'signIn' ? '로그인하지 못했습니다. 잠시 후 다시 시도해 주세요.' : '계정을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.';
}

async function run(promise, mode) {
  let result;
  try {
    result = await promise;
  } catch (error) {
    throw new Error(authErrorMessage(error, mode));
  }
  if (result?.error) throw new Error(authErrorMessage(result.error, mode));
  return result?.data ?? null;
}

export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null, error: null });

  const loadSession = useCallback(async () => {
    try {
      const { data, error } = await authClient.getSession();
      if (error) throw error;
      const user = data?.session ? data.user : null;
      setState({ status: user ? 'signedIn' : 'signedOut', user: user ? { id: String(user.id), email: user.email } : null, error: null });
    } catch {
      setState({ status: 'error', user: null, error: '로그인 상태를 확인할 수 없습니다. 연결 상태를 확인해 주세요.' });
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    onUnauthorized(() => setState({ status: 'signedOut', user: null, error: null }));
    return () => onUnauthorized(() => {});
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      retry: loadSession,
      async signIn(email, password) {
        await run(authClient.signIn.email({ email, password }), 'signIn');
        await loadSession();
      },
      async signUp(email, password) {
        await run(authClient.signUp.email({ email, password, name: email.split('@')[0] }), 'signUp');
        await loadSession();
      },
      async signOut() {
        try {
          await authClient.signOut();
        } finally {
          setState({ status: 'signedOut', user: null, error: null });
        }
      },
    }),
    [state, loadSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
