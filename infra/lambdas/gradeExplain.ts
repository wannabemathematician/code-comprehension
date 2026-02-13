/**
 * POST /gradeExplain
 * Requires JWT. Body: { answer: string, question: object }.
 * Uses Cohere LLM: (A) extract claims, (B) rubric scoring + penalties + communication.
 * Returns full grading JSON; also top-level "score" for backward compatibility.
 */

const corsHeaders = {
  'content-type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

const COHERE_API = 'https://api.cohere.com/v2/chat';
const COHERE_MODEL = 'command-r-plus-08-2024';

type QuestionShape = {
  question?: string;
  markScheme?: Array<{ id?: string; text?: string; weight?: number; required?: boolean }>;
  codeSnippet?: string;
  [key: string]: unknown;
};

async function cohereChat(apiKey: string, userMessage: string, systemMessage?: string, jsonMode = true): Promise<string> {
  const messages: { role: string; content: string }[] = [];
  if (systemMessage) {
    messages.push({ role: 'system', content: systemMessage });
  }
  messages.push({ role: 'user', content: userMessage });

  const res = await fetch(COHERE_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: COHERE_MODEL,
      messages,
      stream: false,
      max_tokens: 4096,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Cohere API ${res.status}: ${errText.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    message?: { content?: Array<{ type?: string; text?: string }> };
    text?: string;
  };
  const content = data.message?.content ?? [];
  const textPart = content.find((p) => p.type === 'text');
  const text = textPart?.text ?? (data as { text?: string }).text ?? '';
  return text;
}

/** Request A: extract claims and suspicious_claims */
function buildClaimExtractionPrompt(candidateAnswer: string): string {
  return `You are an analyst. Extract concrete claims from the candidate's explanation.

Task:
1) Extract the candidate's concrete claims as short bullet points.
   - Each claim must be something the candidate explicitly asserts or clearly implies.
   - Avoid paraphrase inflation. Do not add missing reasoning.
   - Prefer atomic, testable statements (one idea per claim).
2) If the candidate makes any statements that look incorrect or contradictory *on their face*, list them separately as "suspicious_claims".
   - This is a lightweight pre-flag only; do not fully verify.

Candidate answer:
${candidateAnswer}

Return JSON only, matching this schema exactly:
{
  "claims": ["..."],
  "suspicious_claims": ["..."]
}`;
}

/** Request B: rubric scoring + penalties + communication */
function buildRubricPrompt(
  questionText: string,
  codeSnippet: string,
  rubricJson: string,
  candidateAnswer: string,
  claimsJson: string
): { system: string; user: string } {
  const system = `You are an exacting rubric-based grader for code comprehension explanations. You must be fair, consistent, and evidence-based.
- Do not reward verbosity.
- Do not infer missing knowledge.
- Use the provided claims as the primary evidence.
- If a rubric point is not explicitly supported by one or more claims, it must NOT receive full credit.
- Penalize confident incorrectness.

Scoring per rubric point MUST use:
- 0.0 = not addressed / absent / incorrect
- 0.5 = partially addressed, vague, or ambiguous
- 1.0 = clearly addressed with correct reasoning

Communication scoring is separate and MUST NOT compensate for incorrect technical content. Total communication contribution should be small.`;

  const user = `Context:
- Question: ${questionText}
- Code snippet (if any):
${codeSnippet}

Rubric (mark scheme):
${rubricJson}
Notes:
- Each rubric item has: id, description, weight (or importance), and optional misconceptions.

Candidate answer:
${candidateAnswer}

Extracted claims (from Request A):
${claimsJson}

Tasks:
A) Score each rubric point independently using only supported evidence from the extracted claims (and the original answer only if necessary for disambiguation).
   - For each rubric item:
     - score ∈ {0.0, 0.5, 1.0}
     - evidence_claim_indexes: cite the index(es) of claim(s) from "claims" that justify the score
     - rationale: 1–2 sentences explaining why, grounded in evidence

B) Incorrectness check:
   - Identify any incorrect or misleading claims (including from "suspicious_claims" if applicable).
   - For each incorrect claim, provide severity:
     - "critical" (would cause wrong understanding, unsafe change, security/safety risk)
     - "major" (substantive misunderstanding)
     - "minor" (small factual slip or imprecision)

C) Apply penalties:
   - If there is any "critical" incorrect claim, cap total technical score at 60% (before communication) unless the rubric explicitly contradicts this rule.
   - If there is any "major" incorrect claim, subtract 10% from technical score (cumulative up to 30%).
   - Minor incorrect claims do not affect score unless they relate to a critical rubric item.

D) Communication scoring (0.0–1.0 each), based on the candidate answer:
   - structure: clear organization and progression
   - specificity: references concrete code behavior/details vs generic statements
   - causal_reasoning: uses justified cause-effect ("because X, therefore Y")
   - concision: low filler; stays focused
   Compute comms_total as the mean of these four.
   Communication must contribute at most 20% of the final score.

E) Produce an auditable breakdown and final scores.

Return JSON only. Use every rubric id key in "rubric_scores". "technical_raw" should be the weighted average of rubric point scores (0..1). Apply caps/penalties to produce "technical_after_penalties" (0..1). "final_total" = (technical_after_penalties * 0.8) + (comms_total * 0.2). Keep rationales short and evidence-based. Output must be valid JSON (no trailing commas).

Schema:
{
  "rubric_scores": {
    "<RUBRIC_ID>": {
      "score": 0.0,
      "weight": 1,
      "evidence_claim_indexes": [0],
      "rationale": "..."
    }
  },
  "incorrect_claims": [
    {
      "text": "...",
      "severity": "minor|major|critical",
      "reason": "..."
    }
  ],
  "communication": {
    "structure": 0.0,
    "specificity": 0.0,
    "causal_reasoning": 0.0,
    "concision": 0.0,
    "comms_total": 0.0
  },
  "scores": {
    "technical_raw": 0.0,
    "technical_after_penalties": 0.0,
    "communication_weight": 0.2,
    "final_total": 0.0
  },
  "feedback": {
    "met": ["<RUBRIC_ID>"],
    "partial": ["<RUBRIC_ID>"],
    "missed": ["<RUBRIC_ID>"],
    "top_improvements": ["..."]
  },
  "confidence": 0.0
}`;

  return { system, user };
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    const trimmed = raw.trim();
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}') + 1;
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end)) as T;
    }
    return JSON.parse(trimmed) as T;
  } catch {
    return fallback;
  }
}

export const handler = async (event: {
  requestContext?: {
    authorizer?: {
      jwt?: {
        claims?: { sub?: string };
      };
    };
  };
  body?: string;
}) => {
  const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!userId) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }),
    };
  }

  const apiKey = process.env.COHERE_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: { code: 'CONFIG_ERROR', message: 'COHERE_API_KEY not configured' } }),
    };
  }

  let body: { answer?: string; question?: unknown };
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: { code: 'INVALID_INPUT', message: 'Invalid JSON body' } }),
    };
  }

  const answer = typeof body.answer === 'string' ? body.answer.trim() : '';
  const question = body.question;

  if (question == null || typeof question !== 'object') {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: { code: 'INVALID_INPUT', message: 'Missing or invalid question' } }),
    };
  }

  const q = question as QuestionShape;
  const questionText = typeof q.question === 'string' ? q.question : '';
  const codeSnippet = typeof q.codeSnippet === 'string' ? q.codeSnippet : '';
  const markScheme = Array.isArray(q.markScheme) ? q.markScheme : [];
  const rubricJson = JSON.stringify(markScheme, null, 2);

  try {
    // Request A: claim extraction
    const claimPrompt = buildClaimExtractionPrompt(answer);
    const claimsRaw = await cohereChat(apiKey, claimPrompt, undefined, true);
    const claimsResult = parseJson<{ claims?: string[]; suspicious_claims?: string[] }>(claimsRaw, {
      claims: [],
      suspicious_claims: [],
    });
    const claimsJson = JSON.stringify(claimsResult, null, 2);

    // Request B: rubric scoring
    const { system: rubricSystem, user: rubricUser } = buildRubricPrompt(
      questionText,
      codeSnippet,
      rubricJson,
      answer,
      claimsJson
    );
    const rubricRaw = await cohereChat(apiKey, rubricUser, rubricSystem, true);
    const grading = parseJson<{
      rubric_scores?: Record<string, { score: number; weight?: number; evidence_claim_indexes?: number[]; rationale?: string }>;
      incorrect_claims?: Array<{ text?: string; severity?: string; reason?: string }>;
      communication?: { structure?: number; specificity?: number; causal_reasoning?: number; concision?: number; comms_total?: number };
      scores?: { technical_raw?: number; technical_after_penalties?: number; communication_weight?: number; final_total?: number };
      feedback?: { met?: string[]; partial?: string[]; missed?: string[]; top_improvements?: string[] };
      confidence?: number;
    }>(rubricRaw, {});

    const metSet = new Set(grading.feedback?.met ?? []);
    const partialSet = new Set(grading.feedback?.partial ?? []);
    const rubricResults = markScheme.map((point) => {
      const id = point.id ?? '';
      const score = grading.rubric_scores?.[id]?.score ?? 0;
      let status: 'met' | 'partial' | 'missed' = 'missed';
      if (metSet.has(id)) status = 'met';
      else if (partialSet.has(id)) status = 'partial';
      return { id, label: point.text ?? id, status, score };
    });
    (grading as Record<string, unknown>).rubric_results = rubricResults;

    const finalTotal = grading.scores?.final_total ?? 0;
    const response = {
      score: Math.round(finalTotal * 100),
      grading,
    };

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(response),
    };
  } catch (err) {
    console.error('gradeExplain', err);
    const raw = err instanceof Error ? err.message : String(err);
    const message = raw && raw.trim() ? raw.slice(0, 500) : 'Grading failed. Please try again.';
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: { code: 'GRADING_ERROR', message } }),
    };
  }
};
