export type Challenge = {
  id: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  summary: string;
};

const MOCK_CHALLENGES: Challenge[] = [
  {
    id: 'intro-reading',
    title: 'Intro: Reading a Legacy Component',
    difficulty: 'easy',
    summary: 'Walk through a slightly messy React component and predict behavior.'
  },
  {
    id: 'debug-api',
    title: 'Debugging an API Integration',
    difficulty: 'medium',
    summary: 'Trace how data flows from a mocked API into the UI.'
  },
  {
    id: 'refactor-state',
    title: 'Refactor Shared State',
    difficulty: 'hard',
    summary: 'Understand and refactor a tangled state management setup.'
  }
];

function simulateLatency<T>(value: T, delayMs = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), delayMs));
}

export function getChallenges() {
  return simulateLatency(MOCK_CHALLENGES);
}

export function getChallenge(id: string) {
  const match = MOCK_CHALLENGES.find((c) => c.id === id);
  return simulateLatency(match ?? null, 250);
}
