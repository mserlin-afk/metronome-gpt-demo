import { ingestChatEvents } from "@/lib/metronome";

const MOCK_REPLIES = [
  "Sure, I can help with that. Based on your request, here's what I'd suggest...",
  "Great question! Let me think through this step by step...",
  "Interesting use case. Here's a breakdown of your options...",
  "Absolutely. The best approach here would be to start by...",
  "I've analyzed your request and here are my recommendations...",
];

export async function POST(request: Request) {
  const { message, model, apiType, projectId, metronomeCustomerId, userName } =
    await request.json();

  if (!projectId || !metronomeCustomerId || !userName) {
    return Response.json(
      { error: "projectId, metronomeCustomerId, and userName are required" },
      { status: 400 }
    );
  }

  await ingestChatEvents({ metronomeCustomerId, userName, projectId, model, apiType });

  const reply =
    MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)] +
    ` (model: ${model}, api-type: ${apiType})`;

  return Response.json({ reply });
}
