"use client";
import OpenAI from "openai";
import Cookies from "js-cookie";
import { COOKIES } from "@/constants";
import { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import { z } from "zod";

export const getOpenAI = () => {
  const openai = new OpenAI({
    apiKey: Cookies.get(COOKIES.OPENAI_API_KEY),
    dangerouslyAllowBrowser: true,
  });
  return openai;
};

export function evalCriteriaMessages(input_prompt: string) {
  const formatted = `
  Your task is to create an evaluation criteria for a response based on an input prompt.
  The critera will be used to grade a response on a scale of 0-100. You should be a very harsh grader. You should focus on what they did wrong.

  **The evaluation criteria is based on how well a response could answer the input prompt**
  
  Responses that are easy to understand provide a brief overview of the topic you are discussing. Next, break down the information into clear and concise points. Finally, encourage the other person to ask questions to clarify any confusing points.

  Input prompt: 
  ${input_prompt}

  Evaluation Criteria (Rubric) for how well a response could answer the input prompt:
  `;
  const messages: ChatCompletionMessageParam[] = [
    { role: "user", content: formatted },
  ];
  return messages;
}

export function evalStepsMessages(prompt: string, eval_criteria: string) {
  const formatted = `
  Your task is to create guiding steps in evaluating responses based on input propmt.
  You are to use the input prompt, and evaluation criteria to create these steps.
  **The evaluation criteria is based on how well a response could answer the input prompt**

  Input prompt: 
  ${prompt}

  Evaluation Criteria for a response:
  ${eval_criteria}
  
  Evaluation Steps :`;
  const messages: ChatCompletionMessageParam[] = [
    { role: "user", content: formatted },
  ];
  return messages;
}

export function promptSystemAnalysis(rubric: string) {
  const formatted = `Your task is to write an analysis on an input text using a rubric.
    You will receive a rubric to guide you. You must use the rubric.
    The rubric contains a criteria and steps you can use to evaluate the criteria.
    Please make sure you read and understand these instructions carefully. Please keep this document open while reviewing, and refer to it as needed.
    You are to be a harsh grader. You should focus on what they did wrong.

    Prioritize accuracy, logical consistency, clarity, understandability in your analysis.

    There should be no perfect scores because you are a harsh grader. The purpose of this is to compare responses, so you have to be nitpicky.

    Rubric:
    ${rubric}
    `;
  return formatted;
}
export function messageScore(
  prev_messages: ChatCompletionMessageParam[],
  analysis: string
) {
  const messages: ChatCompletionMessageParam[] = [
    ...prev_messages,
    { role: "assistant", content: analysis },
    {
      role: "system",
      content: `Using the analysis you just did, return a JSON response that scores the input text on a scale of 0-100.
      To format, you should use the key "score" to represent the score.`,
    },
  ];
  return messages;
}

export async function createRubric(
  input_prompt: string,
  model: string,
  analysis_temperature: number
) {
  const eval_criteria = await getOpenAI().chat.completions.create({
    model: model,
    messages: evalCriteriaMessages(input_prompt),
    temperature: analysis_temperature,
  });
  const eval_steps = await getOpenAI().chat.completions.create({
    model: model,
    messages: evalStepsMessages(
      input_prompt,
      eval_criteria.choices[0].message.content ?? ""
    ),
    temperature: analysis_temperature,
  });
  const formatted = `Evaluation Criteria:
  ${eval_criteria.choices[0].message.content ?? ""}
  
  Evaluation Steps:
  ${eval_steps.choices[0].message.content ?? ""}
  `;
  return formatted;
}

export function validateAndConvert(input: string): number {
  const numberSchema = z.preprocess((input) => {
    const num = parseFloat(input as any);
    return isNaN(num) ? NaN : Math.round(num);
  }, z.number().int().min(0).max(100));
  try {
    return numberSchema.parse(input);
  } catch (error) {
    return 0;
  }
}
