import OpenAI from "openai";

export async function test(key: string) {
  const openai = new OpenAI({
    apiKey: key,
    dangerouslyAllowBrowser: true,
  });
  const chatCompletion = await openai.chat.completions.create({
    messages: [{ role: "user", content: "What is 1 + 1? Give an analysis" }],
    model: "gpt-3.5-turbo",
  });
  console.log(chatCompletion.choices[0].message.content);
  console.log(chatCompletion);
  return chatCompletion.choices[0].message.content;
}
