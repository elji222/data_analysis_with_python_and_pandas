import { generateImageFromPrompt } from '@/lib/image-generation/service';
import { requirePaidAccess } from '@/lib/supabase-server';

export async function POST(request: Request) {
  const auth = await requirePaidAccess(request);
  if ('error' in auth) return auth.error;

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return Response.json(
      {
        error:
          'Image generation is not configured on the server. Add OPENAI_API_KEY to .env and redeploy.',
      },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';

    if (!prompt) {
      return Response.json({ error: 'Image generation failed: prompt is required.' }, { status: 400 });
    }

    const result = await generateImageFromPrompt({
      prompt,
      aspectRatio: body.aspect_ratio,
      apiKey,
      model: process.env.OPENAI_IMAGE_MODEL ?? null,
    });

    return Response.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Image generation failed. Please try again.';
    return Response.json({ error: message }, { status: 500 });
  }
}
