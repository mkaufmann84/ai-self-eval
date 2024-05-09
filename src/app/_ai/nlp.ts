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

export function promptSystemAnalysis(rubric: string) {
  const formatted = `Your task is to write an analysis on an input text using a rubric.
    You will receive a rubric to guide you. You must use the rubric.
    The rubric contains a criteria and steps you can use to evaluate the criteria.
    Please make sure you read and understand these instructions carefully. Please keep this document open while reviewing, and refer to it as needed.
    

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

export function evalCriteriaMessages(input_prompt: string) {
  const formatted = `Imagine you are a professor. You need a way to grade your students' responses to an input prompt.
  Your task is to create an evaluation criteria for a response based on an input prompt.
  This is like a rubric because it will help grade a response to the input prompt.
  The critera will be used to grade a response on a scale of 0-100.

  Input prompt: 
  ${input_prompt}

  Evaluation Criteria (Rubric) for a response:
  `;
  const messages: ChatCompletionMessageParam[] = [
    { role: "user", content: formatted },
  ];
  return messages;
}

export function evalStepsMessages(eval_criteria: string) {
  const formatted = `Imagine you are a professor. You need a way to grade your students' responses to an input prompt.
  You have an evaluation criteria. However, you need the steps in order to evaluate a response.
  Your task is to generate instructions on how to use the evaluation criteria. 
  
  Input prompt: 
  ${prompt}

  Evaluation Criteria for a response:
  ${eval_criteria}
  
  Evaluation Steps:`;
  const messages: ChatCompletionMessageParam[] = [
    { role: "user", content: formatted },
  ];
  return messages;
}

export async function createRubric(input_prompt: string, model: string) {
  const eval_criteria = await getOpenAI().chat.completions.create({
    model: model,
    messages: evalCriteriaMessages(input_prompt),
  });
  const eval_steps = await getOpenAI().chat.completions.create({
    model: model,
    messages: evalStepsMessages(eval_criteria.choices[0].message.content ?? ""),
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
