import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import OpenAI from "openai";

type Provider = "openai" | "anthropic";

const PROVIDER_CHECKERS: Record<Provider, (apiKey: string) => Promise<void>> = {
  async openai(apiKey: string) {
    const client = new OpenAI({ apiKey });
    await client.models.list();
  },
  async anthropic(apiKey: string) {
    const client = new Anthropic({ apiKey });
    await client.models.list();
  },
};

export async function POST(request: Request) {
  try {
    const { provider, apiKey } = (await request.json()) as {
      provider?: string;
      apiKey?: string;
    };

    if (typeof provider !== "string") {
      return NextResponse.json(
        { ok: false, error: "Provider is required." },
        { status: 400 }
      );
    }

    const normalizedProvider = provider.toLowerCase();

    if (!["openai", "anthropic"].includes(normalizedProvider)) {
      return NextResponse.json(
        { ok: false, error: "Unsupported provider." },
        { status: 400 }
      );
    }

    if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
      return NextResponse.json(
        { ok: false, error: "API key is required." },
        { status: 400 }
      );
    }

    const checkProvider = PROVIDER_CHECKERS[normalizedProvider as Provider];

    await checkProvider(apiKey.trim());

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 400 }
    );
  }
}
