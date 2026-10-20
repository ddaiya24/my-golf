import { useState } from 'react';
import { FormField, PrimaryButton, TextInput } from '../components/form/controls';
import { useAuth } from '../auth/AuthProvider';

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const isSignUp = mode === 'signUp';

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError('이메일과 비밀번호를 입력해 주세요.');
      return;
    }
    if (isSignUp && password.length < 8) {
      setError('비밀번호는 8자 이상으로 입력해 주세요.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (isSignUp) await signUp(email.trim(), password);
      else await signIn(email.trim(), password);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <main className="min-h-dvh bg-white pt-safe pb-safe">
      <div className="w-full max-w-sm mx-auto px-5 pt-16">
        <span className="font-brand italic font-semibold text-[28px] tracking-tight text-brand-deep select-none">my golf.</span>
        <div className="flex flex-col mt-10">
          <span className="text-[11px] font-semibold text-faint uppercase tracking-wider">Mastery Journal</span>
          <h1 className="text-[26px] font-bold text-gray-900 tracking-tight mt-0.5">{isSignUp ? '계정 만들기' : '로그인'}</h1>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5 mt-7">
          <FormField label="이메일" htmlFor="email">
            <TextInput
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              maxLength={254}
            />
          </FormField>
          <FormField label="비밀번호" htmlFor="password" hint={isSignUp ? '8자 이상' : undefined}>
            <TextInput
              id="password"
              type="password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              maxLength={128}
            />
          </FormField>
          {error && (
            <p role="alert" className="text-[13px] text-danger -mt-1">
              {error}
            </p>
          )}
          <PrimaryButton type="submit" disabled={busy} className="mt-1">
            {busy ? (isSignUp ? '계정 만드는 중…' : '로그인 중…') : isSignUp ? '계정 만들기' : '로그인'}
          </PrimaryButton>
        </form>

        <div className="flex justify-center mt-4">
          <button
            type="button"
            onClick={() => {
              setMode(isSignUp ? 'signIn' : 'signUp');
              setError(null);
            }}
            className="text-[13px] font-medium text-muted py-2 px-3"
          >
            {isSignUp ? '이미 계정이 있나요? 로그인' : '계정이 없나요? 계정 만들기'}
          </button>
        </div>
      </div>
    </main>
  );
}
