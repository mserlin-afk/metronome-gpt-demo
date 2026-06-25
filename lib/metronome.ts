import Metronome from "@metronome/sdk";

const client = new Metronome({ bearerToken: process.env.METRONOME_API_KEY });

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function ingestChatEvents({
  metronomeCustomerId,
  userName,
  projectId,
  model,
  apiType,
}: {
  metronomeCustomerId: string;
  userName: string;
  projectId: string;
  model: string;
  apiType: string;
}) {
  const customerId = metronomeCustomerId;

  const timestamp = new Date().toISOString();

  const tokenFields = [
    { field: "input_tokens", value: rand(1000, 10000) },
    { field: "cached_input_tokens", value: rand(1000, 10000) },
    { field: "output_tokens", value: rand(1000, 10000) },
  ];

  const usage = tokenFields.map(({ field, value }) => ({
    event_type: "ChatGPT_text",
    transaction_id: crypto.randomUUID(),
    customer_id: customerId,
    timestamp,
    properties: {
      user_id: userName,
      api_type: apiType,
      api_key_id: "key_demo",
      model_name: model,
      project_id: projectId,
      [field]: value,
    },
  }));

  await client.v1.usage.ingest({ usage });
}
