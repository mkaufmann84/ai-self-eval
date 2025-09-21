"use server";

import OpenAI from "openai";

const serverOpenAI = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generate(input: string) {
  "use server";

  const completion = await serverOpenAI.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: input }],
  });

  return { output: completion.choices?.[0]?.message?.content ?? "" };
}
