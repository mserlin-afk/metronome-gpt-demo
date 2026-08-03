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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const stripeCustomerId =
      typeof session.customer === "string" ? session.customer : session.customer?.id;

    if (!stripeCustomerId) {
      return Response.json({ error: "No customer on session" }, { status: 400 });
    }

    // Retrieve the Stripe customer to check if already provisioned
    const stripeCustomer = await stripe.customers.retrieve(stripeCustomerId);
    if (stripeCustomer.deleted) {
      return Response.json({ received: true });
    }

    // Guard: skip if already provisioned
    if (stripeCustomer.metadata?.metronome_customer_id) {
      return Response.json({ received: true });
    }

    // Create Metronome customer
    const metronomeCustomer = await metronome.v1.customers.create({
      name: stripeCustomer.name || stripeCustomer.email || stripeCustomerId,
    });

    const metronomeCustomerId = metronomeCustomer.data.id;

    // Create Metronome contract
    const startingAt = new Date();
    startingAt.setMinutes(0, 0, 0);
    const contract = await metronome.v1.contracts.create({
      customer_id: metronomeCustomerId,
      starting_at: startingAt.toISOString(),
      rate_card_id: process.env.METRONOME_RATE_CARD_ID!,
    });

    const contractId = contract.data.id;

    // Grant credits based on the amount paid
    const amountPaid = session.amount_total ?? 0;
    if (amountPaid > 0) {
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      expiresAt.setMinutes(0, 0, 0);

      await metronome.v2.contracts.edit({
        contract_id: contractId,
        customer_id: metronomeCustomerId,
        add_credits: [
          {
            product_id: process.env.METRONOME_PREPAID_COMMIT_PRODUCT_ID!,
            access_schedule: {
              credit_type_id: "2714e483-4ff1-48e4-9e25-ac732e8f24f2",
              schedule_items: [
                {
                  amount: amountPaid,
                  starting_at: startingAt.toISOString(),
                  ending_before: expiresAt.toISOString(),
                },
              ],
            },
            name: "Prepaid Credits",
            priority: 1,
          },
        ],
      });
    }

    // Store Metronome customer ID on the Stripe customer for future lookups
    await stripe.customers.update(stripeCustomerId, {
      metadata: { metronome_customer_id: metronomeCustomerId },
    });
  }

  return Response.json({ received: true });
}
