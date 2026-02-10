export type VirtualFile = {
  type: 'file';
  name: string;
  path: string;
  language: 'tsx' | 'ts' | 'js' | 'json' | 'text' | 'py' | 'cpp' | 'html';
  contents: string;
};

export type VirtualDirectory = {
  type: 'dir';
  name: string;
  path: string;
  children: Array<VirtualDirectory | VirtualFile>;
};

export type VirtualNode = VirtualDirectory | VirtualFile;

export const virtualRepoRoot: VirtualDirectory = {
  type: 'dir',
  name: 'code-comprehension-web',
  path: '/',
  children: [
    {
      type: 'dir',
      name: 'src',
      path: '/src',
      children: [
        {
          type: 'dir',
          name: 'routes',
          path: '/src/routes',
          children: [
            {
              type: 'file',
              name: 'CandidatesList.tsx',
              path: '/src/routes/CandidatesList.tsx',
              language: 'tsx',
              contents: `import { useMemo } from 'react';
import { useCandidateFilters } from '../filters/useCandidateFilters';

type Candidate = {
  id: string;
  name: string;
  applied: boolean;
  experience?: number;
};

type Props = {
  allCandidates: Candidate[];
};

export function CandidatesList({ allCandidates }: Props) {
  const { filters } = useCandidateFilters();

  const filtered = useMemo(
    () =>
      allCandidates.filter((c) => {
        if (filters.appliedOnly && !c.applied) return false;
        if (filters.minExperience && (c.experience ?? 0) < filters.minExperience) {
          return false;
        }
        return true;
      }),
    [allCandidates, filters.appliedOnly, filters.minExperience],
  );

  return (
    <table className="min-w-full text-sm">
      <thead>
        <tr>
          <th className="px-2 py-1 text-left">Name</th>
          <th className="px-2 py-1 text-left">Applied</th>
          <th className="px-2 py-1 text-left">Experience</th>
        </tr>
      </thead>
      <tbody>
        {filtered.map((c) => (
          <tr key={c.id} className="border-t border-slate-800">
            <td className="px-2 py-1">{c.name}</td>
            <td className="px-2 py-1">{c.applied ? 'Yes' : 'No'}</td>
            <td className="px-2 py-1">
              {c.experience != null ? c.experience : <span className="text-slate-500">—</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
`
            }
          ]
        },
        {
          type: 'dir',
          name: 'filters',
          path: '/src/filters',
          children: [
            {
              type: 'file',
              name: 'useCandidateFilters.ts',
              path: '/src/filters/useCandidateFilters.ts',
              language: 'ts',
              contents: `import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export type CandidateFilters = {
  appliedOnly: boolean;
  minExperience?: number;
};

export function useCandidateFilters(): { filters: CandidateFilters } {
  const [params] = useSearchParams();

  // NOTE: This hook was partially refactored by an LLM.
  // Be suspicious of the memo dependencies.
  const filters = useMemo(() => {
    const applied = params.get('applied') === 'true';
    const rawMinExp = params.get('minExp');
    const minExperience = rawMinExp ? Number(rawMinExp) : undefined;

    return {
      appliedOnly: applied,
      minExperience,
    };
  }, [params]); // <- is this too coarse?

  return { filters };
}
`
            },
            {
              type: 'file',
              name: 'filters.test.ts',
              path: '/src/filters/filters.test.ts',
              language: 'ts',
              contents: `describe('useCandidateFilters', () => {
  it('treats missing minExp as undefined', () => {
    // ...
  });

  it('should not drop candidates with undefined experience when minExp is unset', () => {
    // ...
  });
});
`
            }
          ]
        },
        {
          type: 'dir',
          name: 'shared',
          path: '/src/shared',
          children: [
            {
              type: 'file',
              name: 'analytics.ts',
              path: '/src/shared/analytics.ts',
              language: 'ts',
              contents: `export function track(event: string, payload: Record<string, unknown>) {
  // Imagine this sends data to a real analytics pipeline.
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug('[analytics]', event, payload);
  }
}
`
            }
          ]
        }
      ]
    },
    {
      type: 'file',
      name: 'README.md',
      path: '/README.md',
      language: 'text',
      contents: `Code Comprehension challenge repo (virtual).

You are investigating why the "Applied" filter appears to hide candidates
who should match the current filter combination. Start from
src/routes/CandidatesList.tsx and trace into src/filters/useCandidateFilters.ts.`
    }
  ]
};

export function findFirstFile(dir: VirtualDirectory): VirtualFile | null {
  for (const child of dir.children) {
    if (child.type === 'file') return child;
    const nested = child.type === 'dir' ? findFirstFile(child) : null;
    if (nested) return nested;
  }
  return null;
}

