import type { ToolHandler } from './types';

const TAVILY_ENDPOINT = 'https://api.tavily.com/search';
const MAX_RESULTS = 5;

type TavilyResult = {
  title?: string;
  url?: string;
  content?: string;
};

function formatSearchResults(query: string, results: TavilyResult[]) {
  if (results.length === 0) {
    return `No web results found for "${query}".`;
  }

  const lines = results.map((result, index) => {
    const title = result.title?.trim() || 'Untitled';
    const url = result.url?.trim() || 'No URL';
    const snippet = result.content?.trim() || 'No snippet available.';
    return `${index + 1}. ${title}\nURL: ${url}\n${snippet}`;
  });

  return [`Web search results for "${query}":`, ...lines].join('\n\n');
}

export const webSearchTool: ToolHandler = {
  definition: {
    name: 'web_search',
    description:
      'Search the web for current news, recent events, live facts, sports scores, weather, and other time-sensitive information. Use when the user asks about latest news, what happened today, or anything that may have changed recently.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Short search query focused on what the user wants to know.',
        },
      },
      required: ['query'],
    },
  },
  async execute(input, context) {
    const query = typeof input.query === 'string' ? input.query.trim() : '';

    if (!query) {
      return 'Search failed: query is required.';
    }

    const apiKey = context.tavilyApiKey?.trim();
    if (!apiKey) {
      return 'Web search is not configured on the server yet. Tell the user you cannot fetch live news right now.';
    }

    const response = await fetch(TAVILY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'basic',
        max_results: MAX_RESULTS,
        include_answer: false,
      }),
    });

    if (!response.ok) {
      return `Web search failed (${response.status}). Tell the user you could not fetch live results right now.`;
    }

    const json = (await response.json()) as { results?: TavilyResult[] };
    return formatSearchResults(query, json.results ?? []);
  },
};
