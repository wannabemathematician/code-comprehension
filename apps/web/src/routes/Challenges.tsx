import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listChallenges, AuthError, type ListChallengeItem } from '../api/client';
import { login } from '../lib/auth';

type FilterStatus = 'all' | 'completed' | 'not-completed';

export default function Challenges() {
  const [challenges, setChallenges] = useState<ListChallengeItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  const fetchChallenges = useCallback(() => {
    setLoading(true);
    setUnauthorized(false);
    setFetchError(null);
    listChallenges()
      .then((data) => {
        setChallenges(data.challenges);
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
        if (err instanceof AuthError) {
          setUnauthorized(true);
        } else {
          setFetchError(err instanceof Error ? err.message : 'Failed to load challenges');
        }
      });
  }, []);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  if (loading) {
    return (
      <section className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-y-auto p-6">
          <header className="mb-4">
            <h1 className="text-lg font-semibold text-slate-50">Challenges</h1>
            <p className="mt-1 text-xs text-slate-300">
              Pick a scenario to practice reading real-world codebases.
            </p>
          </header>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-slate-600 border-t-brand-500" />
            <p className="text-sm text-slate-400">Loading challenges…</p>
          </div>
        </div>
      </section>
    );
  }

  if (unauthorized) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900/80 p-6 text-center">
          <h2 className="text-lg font-semibold text-slate-50">Please log in</h2>
          <p className="mt-2 text-sm text-slate-400">
            Sign in to view and start challenges.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => login()}
              className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm hover:bg-sky-400"
            >
              Log in
            </button>
            <button
              type="button"
              onClick={fetchChallenges}
              className="rounded-md border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
            >
              Try again
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (fetchError) {
    return (
      <section className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-y-auto p-6">
          <header className="mb-4">
            <h1 className="text-lg font-semibold text-slate-50">Challenges</h1>
          </header>
          <div className="rounded-lg border border-red-900/60 bg-slate-900/80 px-4 py-3">
            <p className="text-sm text-red-200">{fetchError}</p>
            <button
              type="button"
              onClick={fetchChallenges}
              className="mt-3 rounded-md bg-brand-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-sky-400"
            >
              Try again
            </button>
          </div>
        </div>
      </section>
    );
  }

  // Get all unique tags
  const allTags = challenges?.flatMap((c) => c.tags || []) ?? [];
  const uniqueTags = Array.from(new Set(allTags)).sort();

  // Filter challenges based on completion status and tags
  const filteredChallenges = challenges?.filter((challenge) => {
    // Filter by completion status
    if (filter === 'completed' && challenge.completed !== true) return false;
    if (filter === 'not-completed' && challenge.completed === true) return false;

    // Filter by tags (if any tags are selected)
    if (selectedTags.size > 0) {
      const challengeTags = challenge.tags || [];
      const hasSelectedTag = challengeTags.some((tag) => selectedTags.has(tag));
      if (!hasSelectedTag) return false;
    }

    return true;
  }) ?? [];

  // Calculate completion stats
  const totalChallenges = challenges?.length ?? 0;
  const completedChallenges = challenges?.filter((c) => c.completed === true).length ?? 0;
  const remainingChallenges = totalChallenges - completedChallenges;
  const completionPercentage = totalChallenges > 0 ? Math.round((completedChallenges / totalChallenges) * 100) : 0;

  // Calculate difficulty breakdown (only for completed challenges)
  // Always show easy, medium, and hard even if 0
  const completedChallengesList = challenges?.filter((c) => c.completed === true) ?? [];
  const difficultyCounts: Record<string, number> = {
    easy: 0,
    medium: 0,
    hard: 0,
  };
  completedChallengesList.forEach((challenge) => {
    const diff = challenge.difficulty?.toLowerCase();
    if (diff === 'easy' || diff === 'medium' || diff === 'hard') {
      difficultyCounts[diff] = (difficultyCounts[diff] || 0) + 1;
    }
  });

  // Calculate unique tags count
  const uniqueTagsCount = uniqueTags.length;

  // Circular progress component
  const CircularProgress = ({ percentage }: { percentage: number }) => {
    const size = 100;
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          className="transform -rotate-90"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-700"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="text-brand-500 transition-all duration-500"
          />
        </svg>
        {/* Percentage text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-base font-bold text-slate-50">{percentage}%</span>
        </div>
      </div>
    );
  };

  // Helper function to get difficulty color
  const getDifficultyColor = (difficulty?: string) => {
    const diff = difficulty?.toLowerCase() || '';
    if (diff === 'easy') return 'text-emerald-400';
    if (diff === 'medium') return 'text-amber-400';
    if (diff === 'hard') return 'text-red-400';
    return 'text-slate-300';
  };

  return (
    <section className="flex flex-1 overflow-hidden">
      {/* Left Dashboard Column */}
      {challenges && challenges.length > 0 && (
        <aside className="w-64 shrink-0 border-r border-slate-800 bg-slate-950/50 p-4 overflow-y-auto">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
                Dashboard
              </h2>
              <div className="flex flex-col items-center gap-3">
                <CircularProgress percentage={completionPercentage} />
                <div className="text-center">
                  <div className="text-lg font-semibold text-slate-50">
                    {completedChallenges} / {totalChallenges}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">Solved</div>
                </div>
              </div>
            </div>

            {/* Completion stats */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Progress
              </span>
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Completed</span>
                  <span className="font-medium text-slate-50">{completedChallenges}</span>
                </div>
                {remainingChallenges > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Remaining</span>
                    <span className="font-medium text-slate-50">{remainingChallenges}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Difficulty breakdown */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Completed by Difficulty
              </span>
              <div className="flex flex-col gap-1.5">
                {(['easy', 'medium', 'hard'] as const).map((diff) => (
                  <div key={diff} className="flex justify-between items-center text-sm">
                    <span className={`capitalize font-medium ${getDifficultyColor(diff)}`}>
                      {diff}
                    </span>
                    <span className="text-slate-400">{difficultyCounts[diff] || 0}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tags count */}
            {uniqueTagsCount > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Topics
                </span>
                <div className="text-sm text-slate-300">
                  {uniqueTagsCount} {uniqueTagsCount === 1 ? 'topic' : 'topics'} covered
                </div>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Right Content Column */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 flex-col overflow-y-auto p-6">
          <header className="mb-4">
            <h1 className="text-lg font-semibold text-slate-50">Challenges</h1>
            <p className="mt-1 text-xs text-slate-300">
              Pick a scenario to practice reading real-world codebases.
            </p>
          </header>

          {/* Filter controls */}
          <div className="mb-4 flex flex-col gap-3">
            {/* Completion status filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Status:</span>
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-brand-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilter('completed')}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  filter === 'completed'
                    ? 'bg-brand-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Completed
              </button>
              <button
                type="button"
                onClick={() => setFilter('not-completed')}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  filter === 'not-completed'
                    ? 'bg-brand-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Not Completed
              </button>
            </div>

            {/* Tag filter */}
            {uniqueTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-400">Topics:</span>
                {uniqueTags.map((tag) => {
                  const isSelected = selectedTags.has(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        setSelectedTags((prev) => {
                          const next = new Set(prev);
                          if (isSelected) {
                            next.delete(tag);
                          } else {
                            next.add(tag);
                          }
                          return next;
                        });
                      }}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                        isSelected
                          ? 'bg-brand-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
                {selectedTags.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedTags(new Set())}
                    className="rounded-md px-2.5 py-1 text-xs font-medium text-slate-400 hover:text-slate-300"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>

          {/* LeetCode-style challenge list */}
          {filteredChallenges.length > 0 ? (
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 overflow-hidden">
              <div className="divide-y divide-slate-800">
                {filteredChallenges.map((challenge, index) => (
                  <Link
                    key={challenge.challengeId}
                    to={`/challenges/${challenge.challengeId}`}
                    className="group flex items-center gap-4 px-4 py-3 hover:bg-slate-900/80 transition-colors"
                  >
                    {/* Challenge number/name */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-400">
                          {index + 1}.
                        </span>
                        <h3 className="text-sm font-medium text-slate-50 group-hover:text-brand-400 transition-colors">
                          {challenge.title ?? 'Untitled'}
                        </h3>
                        {challenge.completed && (
                          <span className="inline-flex items-center">
                            <svg
                              className="w-4 h-4 text-emerald-400"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </span>
                        )}
                      </div>
                      {/* Tags */}
                      {challenge.tags && challenge.tags.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {challenge.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Difficulty badge */}
                    {challenge.difficulty && (
                      <span
                        className={`shrink-0 text-xs font-medium ${getDifficultyColor(
                          challenge.difficulty
                        )}`}
                      >
                        {challenge.difficulty === 'easy'
                          ? 'Easy'
                          : challenge.difficulty === 'medium'
                            ? 'Med.'
                            : challenge.difficulty === 'hard'
                              ? 'Hard'
                              : challenge.difficulty}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/80 p-6 text-center">
              <h2 className="text-base font-semibold text-slate-50">
                {challenges && challenges.length > 0
                  ? `No challenges match your filters`
                  : 'Empty state'}
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                {challenges && challenges.length > 0
                  ? `Try adjusting the status or topic filters to see more challenges.`
                  : `No published challenges exist yet. Challenges with `}
                {challenges && challenges.length === 0 && (
                  <>
                    <code className="rounded bg-slate-800 px-1 py-0.5 font-mono text-xs text-slate-300">
                      status=&quot;published&quot;
                    </code>{' '}
                    will appear here.
                  </>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
