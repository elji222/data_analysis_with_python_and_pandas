import { handleStripeWebhookEvent } from '@/lib/billing/webhook';
import { getStripeClient, getStripeWebhookSecret } from '@/lib/billing/stripe';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return Response.json({ error: 'Missing Stripe signature.' }, { status: 400 });
  }

  try {
    const stripe = getStripeClient();
    const rawBody = await request.text();
    const event = stripe.webhooks.constructEvent(rawBody, signature, getStripeWebhookSecret());
    const serviceClient = createSupabaseServiceClient();
    await handleStripeWebhookEvent(serviceClient, event);
    return Response.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook handling failed.';
    return Response.json({ error: message }, { status: 400 });
  }
}
