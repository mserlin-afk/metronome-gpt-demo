import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stripeCustomerId = searchParams.get("stripeCustomerId");

  if (!stripeCustomerId) {
    return Response.json({ error: "stripeCustomerId is required" }, { status: 400 });
  }

  const customer = await stripe.customers.retrieve(stripeCustomerId);
  if (customer.deleted) {
    return Response.json({ ready: false });
  }

  const metronomeCustomerId = customer.metadata?.metronome_customer_id ?? null;
  return Response.json({ ready: !!metronomeCustomerId, metronomeCustomerId });
}
