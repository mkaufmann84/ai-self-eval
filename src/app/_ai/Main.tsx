"use client";
import { Button } from "@/components/ui/button";
import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createRubric, getOpenAI } from "./nlp";
import Cookies from "js-cookie";
import { COOKIES } from "@/constants";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { z } from "zod";
import { set, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import { v4 as uuidv4 } from "uuid";
import { promptSystemAnalysis, messageScore, validateAndConvert } from "./nlp";
import test from "node:test";
import { CacheManager } from "./lodash";

interface InputContext {
  cM: CacheManager;
  summary: ResponseSummary;
  setSummary: Dispatch<SetStateAction<ResponseSummary>>;
}

const InputContext = React.createContext<InputContext | undefined>(undefined);

function useInputContext() {
  const context = useContext(InputContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within a AppContextProvider");
  }
  return context;
}

const inputForm = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  model: z.enum(["gpt-4-turbo", "gpt-3.5-turbo"]),
  num_responses: z.coerce.number().positive().int(),
});
export type InputForm = z.infer<typeof inputForm>;

export default function Main() {
  const cacheManagerRef = useRef<CacheManager>(new CacheManager());
  const [summary, setSummary] = useState<ResponseSummary>({
    num_responses: 0,
    num_generated: 0,
    num_graded: 0,
    num_rubric: 0,
  });

  useEffect(() => {
    const cacheManager = cacheManagerRef.current;
    return () => {
      cacheManager.resetAllCaches();
    };
  }, []);
  const handleResize = (event: any) => {
    const textarea = event.target;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  };
  const form = useForm<InputForm>({
    resolver: zodResolver(inputForm),
    defaultValues: { prompt: "", num_responses: 1 },
  });
  const [submitted, setSubmitted] = useState<null | {
    inputForm: InputForm;
    id: string;
  }>(null);
  const handleSubmit = (data: InputForm) => {
    const inputSubmissionId = uuidv4();
    cacheManagerRef.current.resetAllCaches();
    setSubmitted({ inputForm: data, id: inputSubmissionId });
    setSummary({
      num_responses: 0,
      num_generated: 0,
      num_graded: 0,
      num_rubric: 0,
    });
    cacheManagerRef.current.cacheHandleInputSubmit(
      inputSubmissionId,
      data,
      setSummary
    );
  };
  useEffect(() => {
    console.log("Main rendered");
  }, []);
  return (
    <InputContext.Provider
      value={{ cM: cacheManagerRef.current, summary, setSummary }}
    >
      <div>
        <nav className="flex items-center gap-4 flex-wrap py-6">
          <Button>History</Button>
        </nav>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <div>
              <FormField
                control={form.control}
                name="prompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xl">Prompt</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={2}
                        placeholder="Instructions..."
                        className="resize-none border rounded px-4 py-2 min-h-[3rem] max-h-[9rem] overflow w-full border-input"
                        {...field}
                        onChange={(event: any) => {
                          handleResize(event);
                          field.onChange(event);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div>
              <Label className="text-xl">Options</Label>
              <div className="flex gap-4">
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel>Model</FormLabel>
                      <Select onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-36">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="gpt-4-turbo">
                            GPT-4 turbo
                          </SelectItem>
                          <SelectItem value="gpt-3.5-turbo">
                            GPT-3.5 turbo
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="num_responses"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel>Number of responses</FormLabel>
                      <FormControl>
                        <Input placeholder="3" {...field} />
                      </FormControl>
                      <FormDescription />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <Button type="submit">Submit</Button>
          </form>
        </Form>
        <div>
          {submitted && (
            /* I can change thetype of this */
            <ResponseParent input_form={submitted.inputForm}></ResponseParent>
          )}
        </div>
      </div>
    </InputContext.Provider>
  );
}
export interface ResponseSummary {
  num_responses: number;
  num_generated: number;
  num_graded: number;
  num_rubric: number;
}
interface ResponseParentProps {
  input_form: InputForm;
}
export type RubricRef =
  | { promise: Promise<string>; settled: boolean }
  | undefined;

const RP = ({ input_form }: ResponseParentProps) => {
  const { cM, summary, setSummary } = useInputContext();

  //in order to trigger a re-render, the child component will use the setSummary.
  //I'd rather have the values be inferred though. Maybe have a useCallback()() that recalculates the summary.
  const triggerUpdate = useCallback(() => {
    const init: ResponseSummary = {
      num_responses: 0,
      num_generated: 0,
      num_graded: 0,
      num_rubric: cM.rubricRef?.settled ? 1 : 0,
    };
    const new_summary = cM.responseRefs.reduce((prev, curr) => {
      prev.num_responses += 1;
      if (curr.finished_response) {
        prev.num_generated += 1;
      }
      if (curr.finished_analysis) {
        prev.num_graded += 1;
      }
      return prev;
    }, init);
    console.log("setting summary");
    setSummary(new_summary);
  }, []);

  if (!input_form) {
    return null;
  }

  return (
    <div>
      {JSON.stringify(summary)}
      {cM.responseRefs.map((response) => {
        console.log("mapping    " + response.id);
        return (
          <Response
            key={response.id}
            prompt={input_form.prompt}
            model={input_form.model}
            data={response}
            triggerUpdate={triggerUpdate}
          ></Response>
        );
      })}
    </div>
  );
};
const ResponseParent = React.memo(RP);

export interface ResponseData {
  id: string;
  response: string;
  finished_response: boolean;
  analysis: string;
  finished_analysis: boolean;
  score: number | null;
}

const R = ({
  prompt,
  model,
  data,
  triggerUpdate,
}: {
  prompt: string;
  model: string;
  data: ResponseData;
  triggerUpdate: () => void;
}) => {
  console.log("rendering child");
  const [text, setText] = React.useState("");
  const [analysis, setAnalysis] = React.useState("");
  const [score, setScore] = React.useState<number | null>(null);
  const { cM } = useInputContext();
  useEffect(() => {
    cM.cacheRunChild(
      data.id,
      prompt,
      model,
      data,
      setText,
      setAnalysis,
      setScore,
      triggerUpdate
    );
  }, []);

  return (
    <div className="border-red-300 border-2 p-4">
      <h1>Response</h1>
      <pre>{text}</pre>
      <div className="w-full h-2 my-20 bg-slate-500 "></div>
      <h1>Analysis</h1>
      <pre>{analysis}</pre>
      <div className="w-full h-2 my-20 bg-slate-500 "></div>
      <h1>Score</h1>
      <pre>{score}</pre>
    </div>
  );
};
const Response = React.memo(R);

/** The way I'm going to do this is after they submit the form, it renders x components and generates a rubroc.
 *  Each component has a state, and the parent will contain an array of these states
 * each component generates its responses. Then awaits rubric, and then will start the analysis.
 * So responses, analysis happens in each component. Not sure how I want to do sorting.
 *
 * For sort, I could have a sidebar that contains the score. And clicking that scrolls to the correct content
 * I could also have a button that sorts
 * Or after everything has finished, I sort automatically.
 *
 * There can be a toggleSort or alertParent, so the parent knows a child has finished.
 * Then it can determine whether tho change the three states, and whether it is done and can be sorted.
 *
 * I could have an editing state that disables button while they are editing the rubric.
 * For now, I'm not going to show the rubric or analysis
 *
 * I can have a state of the sort order. State could also be inferred, and just recalculating when there is an update.
 * ***Better yet, I don't have to have a state of the sort order. It only sorts once everything has finished.
 */

/* use memo so that when sort order changes, it doesn't re-render compnennt */
/* I don't need to handle the changing of a sort order because it will only happen once all components have finished.  */
/* State doesn't have to be known in child. Child is just the display of a state hosted in parent.  */
