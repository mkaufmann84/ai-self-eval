import { NextResponse } from "next/server";

type Provider = "openai" | "anthropic" | "xai" | "gemini" | "openrouter";

const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL ?? "https://api.openai.com";
const ANTHROPIC_BASE_URL =
  process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com";
const ANTHROPIC_VERSION = process.env.ANTHROPIC_VERSION ?? "2023-06-01";
const XAI_BASE_URL = process.env.XAI_BASE_URL ?? "https://api.x.ai";
const GEMINI_BASE_URL = process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com";
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai";

async function fetchJsonSafe(response: Response) {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
}

function withStatus(error: Error, status: number) {
  (error as Error & { status?: number }).status = status;
  return error;
}

function isNetworkError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const cause = (error as Error & { cause?: unknown }).cause;
  const code =
    typeof cause === "object" && cause && "code" in cause
      ? (cause as { code?: unknown }).code
      : undefined;

  const knownNetworkCodes = new Set([
    "ENOTFOUND",
    "ECONNREFUSED",
    "ECONNRESET",
    "EAI_AGAIN",
    "UND_ERR_CONNECT_TIMEOUT",
  ]);

  return (
    (typeof code === "string" && knownNetworkCodes.has(code)) ||
    error.message.toLowerCase().includes("fetch failed")
  );
}

async function checkOpenAI(apiKey: string) {
  const base = OPENAI_BASE_URL.replace(/\/$/, "");
  const response = await fetch(`${base}/v1/models?limit=1`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (response.ok) {
    return;
  }

  const payload = await fetchJsonSafe(response);
  const message =
    payload?.error?.message ||
    payload?.error ||
    `OpenAI responded with status ${response.status}`;

  throw withStatus(new Error(message), response.status);
}

async function checkAnthropic(apiKey: string) {
  const base = ANTHROPIC_BASE_URL.replace(/\/$/, "");
  const response = await fetch(`${base}/v1/models`, {
    method: "GET",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
  });

  if (response.ok) {
    return;
  }

  const payload = await fetchJsonSafe(response);
  const message =
    payload?.error?.message ||
    payload?.error ||
    `Anthropic responded with status ${response.status}`;

  throw withStatus(new Error(message), response.status);
}

async function checkXAI(apiKey: string) {
  const base = XAI_BASE_URL.replace(/\/$/, "");
  const response = await fetch(`${base}/v1/models`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (response.ok) {
    return;
  }

  const payload = await fetchJsonSafe(response);
  const message =
    payload?.error?.message ||
    payload?.error ||
    `xAI responded with status ${response.status}`;

  throw withStatus(new Error(message), response.status);
}

async function checkGemini(apiKey: string) {
  const base = GEMINI_BASE_URL.replace(/\/$/, "");
  const response = await fetch(`${base}/v1beta/models?key=${apiKey}`, {
    method: "GET",
  });

  if (response.ok) {
    return;
  }

  const payload = await fetchJsonSafe(response);
  const message =
    payload?.error?.message ||
    payload?.error ||
    `Gemini responded with status ${response.status}`;

  throw withStatus(new Error(message), response.status);
}

async function checkOpenRouter(apiKey: string) {
  const base = OPENROUTER_BASE_URL.replace(/\/$/, "");
  const response = await fetch(`${base}/api/v1/models`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (response.ok) {
    return;
  }

  const payload = await fetchJsonSafe(response);
  const message =
    payload?.error?.message ||
    payload?.error ||
    `OpenRouter responded with status ${response.status}`;

  throw withStatus(new Error(message), response.status);
}

const PROVIDER_CHECKERS: Record<Provider, (apiKey: string) => Promise<void>> = {
  openai: checkOpenAI,
  anthropic: checkAnthropic,
  xai: checkXAI,
  gemini: checkGemini,
  openrouter: checkOpenRouter,
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

    if (!["openai", "anthropic", "xai", "gemini", "openrouter"].includes(normalizedProvider)) {
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
    if (isNetworkError(error)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Unable to reach the provider. Please check your network connection and try again.",
        },
        { status: 503 }
      );
    }

    if (error instanceof Error && "status" in error) {
      const status = (error as Error & { status?: number }).status ?? 400;
      return NextResponse.json(
        { ok: false, error: error.message },
        { status }
      );
    }

    const message = error instanceof Error ? error.message : "Unknown error.";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 400 }
    );
  }
}
