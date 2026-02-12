/**
 * Questions repository.
 * TODO: Replace with actual data source (DynamoDB, database, etc.)
 * For now, using a minimal in-memory store as placeholder.
 */

export interface Question {
  questionId: string;
  title: string;
  description?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
  [key: string]: unknown;
}

// Placeholder questions - replace with actual data source
const questions: Question[] = [
  {
    questionId: 'q1',
    title: 'What is the bug in the `if __name__ == "__main__":` block?',
    difficulty: 'easy',
    tags: ['python', 'debugging'],
  },
  {
    questionId: 'q2',
    title: 'If you run this file as-is with `python main.py`, what output will you see?',
    difficulty: 'easy',
    tags: ['python', 'execution'],
  },
  {
    questionId: 'q3',
    title: 'What does `if __name__ == "__main__":` do in Python?',
    difficulty: 'easy',
    tags: ['python', 'concepts'],
  },
  {
    questionId: 'q4',
    title: 'Pros/Cons: What are the pros and cons of wrapping `say_hello()` in an `if __name__ == "__main__":` guard?',
    difficulty: 'medium',
    tags: ['python', 'best-practices'],
  },
];

/**
 * Get a question by ID.
 */
export async function getQuestion(questionId: string): Promise<Question | null> {
  // TODO: Replace with actual database query
  return questions.find((q) => q.questionId === questionId) ?? null;
}

/**
 * List all questions.
 */
export async function listQuestions(): Promise<Question[]> {
  // TODO: Replace with actual database query
  return questions;
}
