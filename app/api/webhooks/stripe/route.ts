import Stripe from "stripe";
import Metronome from "@metronome/sdk";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const metronome = new Metronome({ bearerToken: process.env.METRONOME_BEARER_TOKEN });

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return Response.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return Response.json({ error: "Webhook signature verification failed" }, { status: 400 });
  }

  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice;
    const stripeCustomerId =
      typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;

    if (!stripeCustomerId) {
      return Response.json({ error: "No customer on invoice" }, { status: 400 });
    }

    // Retrieve the Stripe customer to check if already provisioned
    const stripeCustomer = await stripe.customers.retrieve(stripeCustomerId);
    if (stripeCustomer.deleted) {
      return Response.json({ received: true });
    }

    // Guard: skip if this is an overage invoice (customer already provisioned)
    if (stripeCustomer.metadata?.metronome_customer_id) {
      return Response.json({ received: true });
    }

    // Create Metronome customer
    const metronomeCustomer = await metronome.v1.customers.create({
      name: stripeCustomer.name || stripeCustomer.email || stripeCustomerId,
      custom_fields: {
        stripe_customer_id: stripeCustomerId,
      },
    });

    const metronomeCustomerId = metronomeCustomer.data.id;

    // Create Metronome contract
    await metronome.v1.contracts.create({
      customer_id: metronomeCustomerId,
      starting_at: new Date().toISOString(),
      rate_card_id: process.env.METRONOME_RATE_CARD_ID!,
    });

    // Store Metronome customer ID on the Stripe customer for future lookups
    await stripe.customers.update(stripeCustomerId, {
      metadata: { metronome_customer_id: metronomeCustomerId },
    });
  }

  return Response.json({ received: true });
}
