import { Link, NavLink, Outlet } from 'react-router-dom';

const navLinkBase =
  'text-sm font-medium transition-colors px-3 py-2 rounded-md border border-transparent';
const navLinkActive =
  'bg-slate-800 text-white border-slate-700 shadow-sm';
const navLinkInactive =
  'text-slate-300 hover:text-white hover:bg-slate-800/60';

function TopNav() {
  const isAuthenticated = false; // TODO: wire to real auth later

  return (
    <header className="border-b border-slate-800 bg-slate-950/70 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-500/10 ring-1 ring-brand-500/40">
            <span className="text-xs font-semibold text-brand-500">CC</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight">
              Code Comprehension
            </span>
            <span className="text-[11px] text-slate-400">
              Practice reading real codebases
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-2">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `${navLinkBase} ${isActive ? navLinkActive : navLinkInactive}`
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/challenges"
            className={({ isActive }) =>
              `${navLinkBase} ${isActive ? navLinkActive : navLinkInactive}`
            }
          >
            Challenges
          </NavLink>
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <span className="text-xs text-slate-300">you@example.com</span>
              <button
                type="button"
                className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-medium text-slate-100 hover:bg-slate-800"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="rounded-md bg-brand-500 px-3 py-1 text-xs font-semibold text-slate-950 shadow-sm hover:bg-sky-400"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export default function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
      <TopNav />
      <main className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 px-4 py-6">
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950/70 shadow-lg shadow-slate-900/50">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
