export default function Login() {
  return (
    <section className="flex flex-1 flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-900/60">
        <h1 className="text-lg font-semibold text-slate-50">Login</h1>
        <p className="mt-1 text-xs text-slate-300">
          Authentication is not wired up yet. This screen is a placeholder for a future
          Cognito-powered login.
        </p>

        <form className="mt-4 space-y-3" onSubmit={(e) => e.preventDefault()}>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-200" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-50 outline-none ring-brand-500/60 placeholder:text-slate-500 focus:border-brand-500 focus:ring-1"
              placeholder="you@example.com"
              disabled
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-200" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-50 outline-none ring-brand-500/60 placeholder:text-slate-500 focus:border-brand-500 focus:ring-1"
              placeholder="********"
              disabled
            />
          </div>

          <button
            type="submit"
            disabled
            className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300"
          >
            Login (mocked)
          </button>
        </form>
      </div>
    </section>
  );
}
