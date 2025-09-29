import { NextResponse } from "next/server";

import { performGeminiCompletion } from "@/lib/providers/gemini";

interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

interface GeminiRequestBody {
  model?: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
  conversation?: ConversationTurn[];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GeminiRequestBody;

    if (!body || typeof body.model !== "string") {
      return NextResponse.json(
        { ok: false, error: "Model is required for Gemini completions." },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.conversation)) {
      return NextResponse.json(
        { ok: false, error: "Conversation must be an array." },
        { status: 400 }
      );
    }

    const turns: ConversationTurn[] = body.conversation.map((turn, index) => {
      if (!turn || (turn.role !== "user" && turn.role !== "assistant")) {
        throw new Error(`Invalid conversation role at index ${index}.`);
      }
      if (typeof turn.content !== "string") {
        throw new Error(`Invalid conversation content at index ${index}.`);
      }
      return turn;
    });

    // Get API key from header to avoid cookies() serialization
    const apiKey = request.headers.get("X-Gemini-API-Key");
    if (!apiKey) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Missing Gemini API key. Store it on the settings page before using Gemini models.",
        },
        { status: 401 }
      );
    }

    const text = await performGeminiCompletion({
      apiKey,
      model: body.model,
      system: body.system,
      temperature: body.temperature,
      maxTokens: body.maxTokens,
      conversation: turns,
    });

    return NextResponse.json({ ok: true, text });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected Gemini completion error.";

    return NextResponse.json(
      { ok: false, error: message },
      { status: 400 }
    );
  }
}
