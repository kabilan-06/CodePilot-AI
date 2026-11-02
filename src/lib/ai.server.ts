// Shared AI layer for the signature features (bug radar, agent swarm, healing,
// visual QA). Mirrors the provider fallback strategy of review.functions.ts so
// every feature degrades the same way when the gateway is unavailable.

type AiContentPart =
  { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };

export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string | AiContentPart[];
}

interface AiProvider {
  name: "lovable" | "groq" | "openai";
  key: string;
  baseUrl: string;
  model: string;
  vision: boolean;
}

function resolveProvider(): AiProvider {
  const lovable = process.env.LOVABLE_API_KEY?.trim();
  if (lovable) {
    return {
      name: "lovable",
      key: lovable,
      baseUrl: "https://ai.gateway.lovable.dev/v1",
      model: process.env.LOVABLE_MODEL?.trim() || "google/gemini-3.6-flash",
      vision: true,
    };
  }

  const groq = process.env.GROQ_API_KEY?.trim();
  if (groq) {
    return {
      name: "groq",
      key: groq,
      baseUrl: "https://api.groq.com/openai/v1",
      model: process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile",
      vision: false,
    };
  }

  const openai = process.env.OPENAI_API_KEY?.trim();
  if (openai) {
    return {
      name: "openai",
      key: openai,
      baseUrl: (process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(
        /\/$/,
        "",
      ),
      model: process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini",
      vision: true,
    };
  }

  throw new Error("AI is not configured. Set LOVABLE_API_KEY, GROQ_API_KEY, or OPENAI_API_KEY.");
}

export function aiStatus() {
  try {
    const provider = resolveProvider();
    return {
      configured: true,
      provider: provider.name,
      model: provider.model,
      vision: provider.vision,
    };
  } catch {
    return { configured: false, provider: "none", model: "", vision: false };
  }
}

function hasImageParts(messages: AiMessage[]): boolean {
  return messages.some(
    (m) => typeof m.content !== "string" && m.content.some((p) => p.type === "image_url"),
  );
}

export async function aiComplete(request: {
  messages: AiMessage[];
  json?: boolean;
  maxTokens?: number;
  temperature?: number;
}): Promise<{ content: string; model: string }> {
  const provider = resolveProvider();

  if (hasImageParts(request.messages) && !provider.vision) {
    throw new Error(
      "This feature needs a vision model. Configure LOVABLE_API_KEY or OPENAI_API_KEY (a Groq text model cannot read screenshots).",
    );
  }

  const body: Record<string, unknown> = {
    model: provider.model,
    messages: request.messages,
    temperature: request.temperature ?? 0.3,
  };
  if (request.json) body.response_format = { type: "json_object" };
  if (request.maxTokens) body.max_tokens = request.maxTokens;

  let response: Response;
  try {
    response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.key}`,
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error(`AI network error (${provider.name})`, error);
    throw new Error("The AI service could not be reached.");
  }

  if (response.status === 429) {
    throw new Error("Rate limit reached. Please try again in a moment.");
  }
  if (response.status === 402) {
    throw new Error("AI credits exhausted. Add credits to continue.");
  }
  if (!response.ok) {
    const text = await response.text();
    console.error(`AI gateway error [${response.status}]: ${text}`);
    throw new Error("The AI service is temporarily unavailable.");
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = payload.choices?.[0]?.message?.content ?? "";
  if (!content.trim()) {
    throw new Error("The AI returned an empty response.");
  }
  return { content, model: provider.model };
}

export function parseAiJson<T = Record<string, unknown>>(raw: string): T {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("The AI returned an unreadable response.");
  }
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}
