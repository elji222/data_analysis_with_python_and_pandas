import { MAX_OUTPUT_TOKENS } from '@/constants/ai';
import type { ChatApiMessage, CouncilCritique, CouncilReview } from '@/types/chat';

import { toOpenAiMessages } from './run-openai-agent';
import type { AgentStreamEvent } from './types';

const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages';
// Match the room other providers get (they reject max_tokens on GPT-5-era APIs).
const CANDIDATE_MAX_TOKENS = MAX_OUTPUT_TOKENS;
const RANKING_MAX_TOKENS = 900;
const STAGE_TIMEOUT_MS = 60_000;

export type CouncilMember = {
  id: string;
  label: string;
  provider: 'anthropic' | 'openai-compatible';
  apiModel: string;
  baseUrl?: string;
  apiKey: string;
};

export type RunCouncilAgentOptions = {
  members: CouncilMember[];
  systemPrompt: string;
  messages: ChatApiMessage[];
  onEvent: (event: AgentStreamEvent) => void;
};

export type RunCouncilAgentResult = {
  fullReply: string;
  usedTools: boolean;
};

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out.`)), STAGE_TIMEOUT_MS);
    }),
  ]);
}

async function completeWithMember(
  member: CouncilMember,
  systemPrompt: string,
  messages: ChatApiMessage[],
  maxTokens: number
): Promise<string> {
  if (member.provider === 'anthropic') {
    const response = await fetch(ANTHROPIC_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': member.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: member.apiModel,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      throw new Error(`${member.label} request failed (${response.status}).`);
    }

    const json = (await response.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };

    return (json.content ?? [])
      .filter((block) => block.type === 'text' && block.text)
      .map((block) => block.text)
      .join('\n')
      .trim();
  }

  const response = await fetch(`${member.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${member.apiKey}`,
    },
    body: JSON.stringify({
      model: member.apiModel,
      // GPT-5-era chat completions reject `max_tokens`; leave uncapped here.
      messages: [{ role: 'system', content: systemPrompt }, ...toOpenAiMessages(messages)],
    }),
  });

  if (!response.ok) {
    throw new Error(`${member.label} request failed (${response.status}).`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };

  return (json.choices?.[0]?.message?.content ?? '').trim();
}

async function streamWithMember(
  member: CouncilMember,
  systemPrompt: string,
  messages: ChatApiMessage[],
  onDelta: (text: string) => void
): Promise<string> {
  const isAnthropic = member.provider === 'anthropic';

  const response = await fetch(
    isAnthropic ? ANTHROPIC_ENDPOINT : `${member.baseUrl}/chat/completions`,
    {
      method: 'POST',
      headers: isAnthropic
        ? {
            'Content-Type': 'application/json',
            'x-api-key': member.apiKey,
            'anthropic-version': '2023-06-01',
          }
        : {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${member.apiKey}`,
          },
      body: JSON.stringify(
        isAnthropic
          ? {
              model: member.apiModel,
              max_tokens: MAX_OUTPUT_TOKENS,
              system: systemPrompt,
              messages,
              stream: true,
            }
          : {
              model: member.apiModel,
              messages: [
                { role: 'system', content: systemPrompt },
                ...toOpenAiMessages(messages),
              ],
              stream: true,
            }
      ),
    }
  );

  if (!response.ok || !response.body) {
    throw new Error(`${member.label} request failed (${response.status}).`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;

      const data = line.slice(6).trim();
      if (!data || data === '[DONE]') continue;

      let parsed: {
        type?: string;
        delta?: { type?: string; text?: string };
        choices?: Array<{ delta?: { content?: string | null } }>;
      };

      try {
        parsed = JSON.parse(data);
      } catch {
        continue;
      }

      const text = isAnthropic
        ? parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta'
          ? (parsed.delta.text ?? '')
          : ''
        : (parsed.choices?.[0]?.delta?.content ?? '');

      if (text) {
        fullText += text;
        onDelta(text);
      }
    }
  }

  return fullText;
}

const ANSWER_LABELS = ['A', 'B', 'C', 'D', 'E'];

/**
 * Pulls a ranking like ["B","A","C"] out of a model reply. Models are asked for
 * strict JSON but drift, so any order of valid labels found in the text counts,
 * and labels the model forgot are appended in original order.
 */
export function parseCouncilRanking(text: string, validLabels: string[]): string[] {
  // Prefer the bracketed array the prompt asks for; otherwise fall back to
  // standalone letters so prose like "Answer B is best" doesn't match the
  // A in "Answer".
  const bracketed = text.match(/\[[^\]]*\]/)?.[0];
  const source = bracketed ?? text;
  const seen: string[] = [];

  for (const match of source.toUpperCase().matchAll(/\b([A-Z])\b/g)) {
    const label = match[1];
    if (validLabels.includes(label) && !seen.includes(label)) {
      seen.push(label);
    }
  }

  for (const label of validLabels) {
    if (!seen.includes(label)) {
      seen.push(label);
    }
  }

  return seen;
}

export type CouncilJudgment = {
  ranking: string[];
  critiques: Record<string, string>;
};

/**
 * Reads ranking + per-answer critiques from a judge reply. Critiques are keyed
 * by the anonymous answer letter (A/B/C) so they can be remapped to real models.
 */
export function parseCouncilJudgment(text: string, validLabels: string[]): CouncilJudgment {
  const critiques: Record<string, string> = {};

  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end > start) {
      const parsed = JSON.parse(text.slice(start, end + 1)) as {
        ranking?: unknown;
        critiques?: Record<string, unknown>;
      };

      if (parsed.critiques && typeof parsed.critiques === 'object') {
        for (const label of validLabels) {
          const value = parsed.critiques[label] ?? parsed.critiques[label.toLowerCase()];
          if (typeof value === 'string' && value.trim()) {
            critiques[label] = value.trim();
          }
        }
      }

      if (Array.isArray(parsed.ranking)) {
        const ranking = parseCouncilRanking(JSON.stringify(parsed.ranking), validLabels);
        return { ranking, critiques };
      }
    }
  } catch {
    // Fall through to the ranking-only parser.
  }

  return {
    ranking: parseCouncilRanking(text, validLabels),
    critiques,
  };
}

/**
 * Borda count: first place earns (n-1) points, last earns 0. Returns labels
 * sorted best-first; ties break by the original label order.
 */
export function scoreCouncilRankings(
  rankings: string[][],
  validLabels: string[]
): string[] {
  const points = new Map<string, number>(validLabels.map((label) => [label, 0]));

  for (const ranking of rankings) {
    ranking.forEach((label, position) => {
      if (!points.has(label)) return;
      points.set(label, (points.get(label) ?? 0) + (ranking.length - 1 - position));
    });
  }

  return [...validLabels].sort((a, b) => {
    const diff = (points.get(b) ?? 0) - (points.get(a) ?? 0);
    return diff !== 0 ? diff : validLabels.indexOf(a) - validLabels.indexOf(b);
  });
}

/**
 * Peer-only Borda: each judge's ranking of their own answer is removed before
 * scoring, so models cannot vote themselves into first place.
 */
export function scoreCouncilPeerRankings(
  judgments: Array<{ memberId: string; ranking: string[] }>,
  candidates: Array<{ label: string; memberId: string }>,
  validLabels: string[]
): string[] {
  const memberIdByLabel = new Map(
    candidates.map((candidate) => [candidate.label, candidate.memberId])
  );

  const peerRankings = judgments
    .map(({ memberId, ranking }) =>
      ranking.filter((label) => memberIdByLabel.get(label) !== memberId)
    )
    .filter((ranking) => ranking.length > 0);

  if (peerRankings.length === 0) {
    return [...validLabels];
  }

  return scoreCouncilRankings(peerRankings, validLabels);
}

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getLatestUserText(messages: ChatApiMessage[]): string {
  const latest = [...messages].reverse().find((message) => message.role === 'user');
  if (!latest) return '';

  if (typeof latest.content === 'string') return latest.content;

  return latest.content
    .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
}

export async function runCouncilAgent(
  options: RunCouncilAgentOptions
): Promise<RunCouncilAgentResult> {
  const chairman =
    options.members.find((member) => member.provider === 'anthropic') ?? options.members[0];

  if (!chairman) {
    const message = 'Council mode needs at least one configured model.';
    options.onEvent({ type: 'error', error: message });
    throw new Error(message);
  }

  // With a single configured model there is nothing to rank; answer directly.
  if (options.members.length < 2) {
    const fullReply = await withTimeout(
      streamWithMember(chairman, options.systemPrompt, options.messages, (text) =>
        options.onEvent({ type: 'text', text })
      ),
      'Council reply'
    );

    if (!fullReply.trim()) {
      const message = 'Soulmate AI sent an empty reply.';
      options.onEvent({ type: 'error', error: message });
      throw new Error(message);
    }

    options.onEvent({ type: 'done', fullReply });
    return { fullReply, usedTools: false };
  }

  // Stage 1: every member answers independently, in parallel.
  options.onEvent({ type: 'status', status: 'council_answers' });

  const answerResults = await Promise.all(
    options.members.map(async (member) => {
      try {
        const answer = await withTimeout(
          completeWithMember(
            member,
            options.systemPrompt,
            options.messages,
            CANDIDATE_MAX_TOKENS
          ),
          `${member.label} answer`
        );
        return answer.trim() ? { member, answer: answer.trim() } : null;
      } catch {
        return null;
      }
    })
  );

  const candidates = shuffled(
    answerResults.filter(
      (entry): entry is { member: CouncilMember; answer: string } => entry !== null
    )
  ).map((entry, index) => ({ ...entry, label: ANSWER_LABELS[index] }));

  if (candidates.length === 0) {
    const message = 'None of the council models could answer. Please try again.';
    options.onEvent({ type: 'error', error: message });
    throw new Error(message);
  }

  const validLabels = candidates.map((candidate) => candidate.label);
  const question = getLatestUserText(options.messages);
  let rankedLabels = validLabels;
  const critiquesByLabel = new Map<string, CouncilCritique[]>();

  for (const label of validLabels) {
    critiquesByLabel.set(label, []);
  }

  if (candidates.length > 1) {
    // Stage 2: members rank the anonymized answers and critique each one.
    options.onEvent({ type: 'status', status: 'council_ranking' });

    const answersBlock = candidates
      .map((candidate) => `Answer ${candidate.label}:\n${candidate.answer}`)
      .join('\n\n---\n\n');

    const rankingPrompt: ChatApiMessage[] = [
      {
        role: 'user',
        content: `Question from the user:\n${question}\n\nCandidate answers:\n\n${answersBlock}\n\nRank these answers from best to worst for the user. Judge how well each helps the user: accuracy, clarity of reasoning, completeness, and usefulness for the substance of the question. Do not reward or penalize tone, warmth, friendliness, empathy, or writing style by themselves.

Also write a short critique of EACH answer from an analytical perspective only. Do not comment on tone, warmth, friendliness, empathy, or style.

Format EACH critique exactly like this:
1) One short free-text sentence first (overall take or what it got right). Do NOT use **bold** in that sentence.
2) Then 1-3 bullet lines starting with "- " for the actual criticisms only (gaps, weak reasoning, missing facts, unclear claims). In those bullets, wrap only the critical phrases in **double asterisks** like **this**. Never bold compliments or praise.

Example critique string:
"Clear overview of the main options.\n- Missed **tradeoffs on cost**\n- No concrete **next step for the user**"

Reply with ONLY JSON in this exact shape:
{"ranking":["B","A","C"],"critiques":{"A":"Clear overview of the main options.\\n- Missed **tradeoffs on cost**\\n- No concrete **next step for the user**","B":"...","C":"..."}}`,
      },
    ];

    const judgments = (
      await Promise.all(
        options.members.map(async (member) => {
          try {
            const reply = await withTimeout(
              completeWithMember(
                member,
                'You are an impartial judge comparing AI answers for the user. Rank by usefulness, accuracy, reasoning, and completeness—not by tone or warmth. For critiques: free-text sentence first (no bold), then "- " bullets for real criticisms only, with **bold** only on the critical phrases. Reply with only the JSON object.',
                rankingPrompt,
                RANKING_MAX_TOKENS
              ),
              `${member.label} ranking`
            );
            return {
              member,
              judgment: parseCouncilJudgment(reply, validLabels),
            };
          } catch {
            return null;
          }
        })
      )
    ).filter(
      (
        entry
      ): entry is {
        member: CouncilMember;
        judgment: CouncilJudgment;
      } => entry !== null
    );

    for (const { member, judgment } of judgments) {
      for (const [label, text] of Object.entries(judgment.critiques)) {
        // A model does not critique its own anonymous answer.
        const author = candidates.find((candidate) => candidate.label === label);
        if (!author || author.member.id === member.id) continue;

        critiquesByLabel.get(label)?.push({
          fromModelId: member.id,
          fromModelLabel: member.label,
          text,
        });
      }
    }

    if (judgments.length > 0) {
      rankedLabels = scoreCouncilPeerRankings(
        judgments.map((entry) => ({
          memberId: entry.member.id,
          ranking: entry.judgment.ranking,
        })),
        candidates.map((candidate) => ({
          label: candidate.label,
          memberId: candidate.member.id,
        })),
        validLabels
      );
    }
  }

  const byLabel = new Map(candidates.map((candidate) => [candidate.label, candidate]));
  const rankedCandidates = rankedLabels
    .map((label) => byLabel.get(label))
    .filter((candidate): candidate is (typeof candidates)[number] => Boolean(candidate));

  const review: CouncilReview = {
    answers: rankedCandidates.map((candidate, index) => ({
      modelId: candidate.member.id,
      modelLabel: candidate.member.label,
      rank: index + 1,
      answer: candidate.answer,
      critiques: critiquesByLabel.get(candidate.label) ?? [],
    })),
  };

  // Stage 3: the chairman writes the reply the user sees, guided by the vote.
  const digest = rankedCandidates
    .map(
      (candidate, index) =>
        `Rank ${index + 1} (${candidate.member.label}):\n${candidate.answer}`
    )
    .join('\n\n---\n\n');

  const chairmanMessages: ChatApiMessage[] = [
    ...options.messages,
    {
      role: 'assistant',
      content:
        'I consulted a council of AI models. Their answers, ordered by the council vote (best first):\n\n' +
        digest,
    },
    {
      role: 'user',
      content:
        'Write the final reply to my last message, building on the strongest answer(s) above. Keep the usual warm Soulmate AI voice, do not mention the council or the vote, and answer me directly.',
    },
  ];

  const fullReply = await withTimeout(
    streamWithMember(chairman, options.systemPrompt, chairmanMessages, (text) =>
      options.onEvent({ type: 'text', text })
    ),
    'Council reply'
  );

  if (!fullReply.trim()) {
    const message = 'Soulmate AI sent an empty reply.';
    options.onEvent({ type: 'error', error: message });
    throw new Error(message);
  }

  if (review.answers.length > 0) {
    options.onEvent({ type: 'council_review', review });
  }

  options.onEvent({ type: 'done', fullReply });
  return { fullReply, usedTools: false };
}
