import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const ROTATING_AREAS = ['software engineering', 'data science', 'machine learning'];
const ROTATION_INTERVAL_MS = 2600;

export default function Home() {
  const [areaIndex, setAreaIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setAreaIndex((current) => (current + 1) % ROTATING_AREAS.length);
    }, ROTATION_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  const currentArea = ROTATING_AREAS[areaIndex];

  return (
    <main className="flex flex-1 flex-col overflow-y-auto">
      {/* Hero */}
      <section className="relative border-b border-slate-800 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 px-6 py-10 md:px-10 md:py-14">
        <div className="pointer-events-none absolute inset-x-0 top-10 mx-auto h-72 max-w-5xl rounded-full bg-sky-500/10 blur-3xl" />
        <div className="relative mx-auto flex min-h-[calc(100vh-7rem)] max-w-5xl flex-col gap-10 md:flex-row md:items-center">
          <div className="flex-1 space-y-4 md:flex-[0.9]">
            <header>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-400">
                Code Comprehension
              </p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-slate-50 md:text-4xl lg:text-5xl">
                Practice real{' '}
                <span className="relative inline-flex items-baseline">
                  <span className="cc-rotate-container mr-1">
                    <span key={currentArea} className="cc-rotate-word text-brand-400">
                      {currentArea}
                    </span>
                  </span>
                </span>
                <span className="block text-slate-300">not algorithm puzzles.</span>
              </h1>
            </header>

            <p className="max-w-xl text-sm text-slate-300 md:text-base">
              Drop into realistic repos, track down real bugs, and explain how the code
              actually behaves — the way you work day to day.
            </p>

            <p className="max-w-xl text-xs text-slate-400 md:text-sm">
              AI makes writing code cheap. Understanding and trusting existing code is
              the real skill.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-md bg-brand-500 px-5 py-2 text-xs font-semibold text-slate-950 shadow-sm hover:bg-sky-400 md:text-sm"
              >
                Start practicing
              </Link>
              <Link
                to="/challenges"
                className="text-xs font-medium text-slate-300 hover:text-white md:text-sm"
              >
                Browse challenges
              </Link>
            </div>
          </div>

          <aside className="flex-1 rounded-2xl border border-slate-800 bg-slate-950/75 p-6 text-slate-200 shadow-2xl shadow-slate-950/80 md:flex-[1.1]">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-slate-400">
              Example scenario
            </p>
            <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/80 p-4">
              <p className="text-xs leading-relaxed text-slate-300 md:text-sm">
                <span className="font-semibold text-sky-300">#frontend-team</span> You
                just inherited a React codebase where an LLM “helped” refactor the data
                loading layer. Users report that filters randomly stop working.
              </p>
              <p className="text-xs leading-relaxed text-slate-300 md:text-sm">
                Your job: trace the data flow, explain what actually happens, and pick a
                fix you&apos;d be confident shipping to production.
              </p>
            </div>
          </aside>
        </div>
      </section>

      {/* What makes this different */}
      <section
        aria-labelledby="cc-different-heading"
        className="border-b border-slate-800 bg-slate-950 px-6 py-8 md:px-10"
      >
        <div className="mx-auto max-w-4xl">
          <header className="mb-4">
            <h2
              id="cc-different-heading"
              className="text-sm font-semibold text-slate-50"
            >
              What makes Code Comprehension different
            </h2>
            <p className="mt-1 text-xs text-slate-300">
              Not whiteboard puzzles. Not contrived snippets. You work inside full,
              slightly messy repositories.
            </p>
          </header>

          <div className="grid gap-3 md:grid-cols-2">
            <article className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
              <h3 className="text-xs font-semibold text-slate-50">
                Read existing code, not empty files
              </h3>
              <p className="mt-1 text-[11px] text-slate-300">
                Explore components, utils, and services that already exist. Practice
                building accurate mental models from someone else&apos;s code.
              </p>
            </article>

            <article className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
              <h3 className="text-xs font-semibold text-slate-50">
                Debug messy &amp; LLM-generated systems
              </h3>
              <p className="mt-1 text-[11px] text-slate-300">
                Investigate flaky behavior in legacy or AI-edited code. Learn to spot
                subtle regressions and missing invariants.
              </p>
            </article>

            <article className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
              <h3 className="text-xs font-semibold text-slate-50">
                Answer deep comprehension questions
              </h3>
              <p className="mt-1 text-[11px] text-slate-300">
                Instead of &quot;what is the output?&quot;, answer questions about
                behavior, edge cases, data flow, and trade-offs in the actual code.
              </p>
            </article>

            <article className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
              <h3 className="text-xs font-semibold text-slate-50">
                Work from realistic Slack-style prompts
              </h3>
              <p className="mt-1 text-[11px] text-slate-300">
                Receive context the way you do on the job: partial specs, screenshots,
                and messages from PMs and teammates.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section
        aria-labelledby="cc-who-heading"
        className="border-b border-slate-800 bg-slate-950 px-6 py-8 md:px-10"
      >
        <div className="mx-auto max-w-4xl">
          <header className="mb-4">
            <h2 id="cc-who-heading" className="text-sm font-semibold text-slate-50">
              Who it&apos;s for
            </h2>
            <p className="mt-1 text-xs text-slate-300">
              Anyone who needs to quickly understand unfamiliar code and make safe
              changes.
            </p>
          </header>

          <div className="grid gap-3 md:grid-cols-3">
            <article className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
              <h3 className="text-xs font-semibold text-slate-50">
                Software engineers
              </h3>
              <p className="mt-1 text-[11px] text-slate-300">
                Practice joining a new codebase, untangling features, and explaining how
                things really work to your team.
              </p>
            </article>

            <article className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
              <h3 className="text-xs font-semibold text-slate-50">Data scientists</h3>
              <p className="mt-1 text-[11px] text-slate-300">
                Get comfortable navigating production pipelines, feature stores, and
                analytics code you didn&apos;t write.
              </p>
            </article>

            <article className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
              <h3 className="text-xs font-semibold text-slate-50">
                Interview prep &amp; on-the-job
              </h3>
              <p className="mt-1 text-[11px] text-slate-300">
                Go beyond algorithms with exercises that mirror system design,
                onboarding, and debugging interviews.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        aria-labelledby="cc-how-heading"
        className="border-b border-slate-800 bg-slate-950 px-6 py-8 md:px-10"
      >
        <div className="mx-auto max-w-4xl">
          <header className="mb-4">
            <h2 id="cc-how-heading" className="text-sm font-semibold text-slate-50">
              How it works
            </h2>
            <p className="mt-1 text-xs text-slate-300">
              Each challenge walks you through the same workflow you use in real
              engineering work.
            </p>
          </header>

          <ol className="grid gap-3 text-[11px] text-slate-300 md:grid-cols-4">
            <li className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Step 1
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-50">
                Pick a challenge
              </p>
              <p className="mt-1">
                Choose a scenario that matches your level, from warm-up repos to tricky
                production bugs.
              </p>
            </li>
            <li className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Step 2
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-50">
                Explore a real repo
              </p>
              <p className="mt-1">
                Navigate the file tree, read components and services, and trace how data
                moves through the system.
              </p>
            </li>
            <li className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Step 3
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-50">
                Understand intent &amp; behavior
              </p>
              <p className="mt-1">
                Connect Slack-style requirements with what the code actually does — and
                where it diverges.
              </p>
            </li>
            <li className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Step 4
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-50">
                Explain and improve
              </p>
              <p className="mt-1">
                Answer deep comprehension questions and propose safe, incremental
                changes you&apos;d ship.
              </p>
            </li>
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-950 px-6 py-8 md:px-10">
        <div className="mx-auto flex max-w-4xl flex-col items-start justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/80 p-5 text-sm text-slate-50 md:flex-row md:items-center">
          <div>
            <h2 className="text-sm font-semibold">
              Sign in to try a challenge
            </h2>
            <p className="mt-1 text-xs text-slate-300">
              Jump into a repo, debug a real bug, and see how quickly you can build
              trust in unfamiliar code.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-md bg-brand-500 px-4 py-1.5 text-xs font-semibold text-slate-950 shadow-sm hover:bg-sky-400"
            >
              Log in
            </Link>
            <Link
              to="/challenges"
              className="text-xs font-medium text-slate-300 hover:text-white"
            >
              View challenges
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
