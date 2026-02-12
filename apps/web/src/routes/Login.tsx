import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { exchangeCodeForTokens, login } from '../lib/auth';

type Status = 'idle' | 'redirecting' | 'exchanging' | 'error' | 'success';

export default function Login() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      setStatus('error');
      setErrorMessage(
        errorDescription ?? error.replace(/_/g, ' ') ?? 'Login failed.'
      );
      return;
    }

    if (code) {
      setStatus('exchanging');
      exchangeCodeForTokens(code)
        .then(() => {
          setStatus('success');
          navigate('/challenges', { replace: true });
        })
        .catch((err) => {
          setStatus('error');
          setErrorMessage(err instanceof Error ? err.message : 'Token exchange failed.');
        });
      return;
    }

    setStatus('redirecting');
    login().catch((err) => {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to start login.');
    });
  }, [searchParams, navigate]);

  if (status === 'error') {
    return (
      <section className="flex flex-1 flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-xl border border-red-900/60 bg-slate-900/80 p-6 shadow-lg shadow-slate-900/60">
          <h1 className="text-lg font-semibold text-red-200">Login failed</h1>
          <p className="mt-2 text-sm text-slate-300">{errorMessage}</p>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => {
                setStatus('idle');
                setErrorMessage(null);
                login().catch((e) => {
                  setErrorMessage(e instanceof Error ? e.message : 'Failed to start login.');
                });
              }}
              className="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-sky-400"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => navigate('/', { replace: true })}
              className="rounded-md border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
            >
              Back to home
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-1 flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-900/60">
        <h1 className="text-lg font-semibold text-slate-50">Login</h1>
        <p className="mt-2 text-sm text-slate-400">
          {status === 'exchanging' || status === 'success'
            ? 'Signing you in…'
            : 'Redirecting to sign in…'}
        </p>
        <div className="mt-4 flex justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-brand-500" />
        </div>
      </div>
    </section>
  );
}
