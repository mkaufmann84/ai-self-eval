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
import { createRubric } from "./nlp";
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
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { v4 as uuidv4 } from "uuid";
import { CacheManager } from "./lodash";
import ReactMarkdown from "react-markdown";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useTheme } from "next-themes";
import ErrorDialog from "../_components/ErrorDialog";
import {
  ANALYSIS_MODEL_OPTIONS,
  ANALYSIS_MODEL_VALUES,
  RESPONSE_MODEL_OPTIONS,
  RESPONSE_MODEL_VALUES,
} from "@/lib/model-options";

interface InputContext {
  cM: React.MutableRefObject<CacheManager>;
  triggerUpdate: () => void;
}

const InputContext = React.createContext<InputContext | undefined>(undefined);

function useInputContext() {
  const context = useContext(InputContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within a AppContextProvider");
  }
  return context;
}

export default function Main() {
  const [dialogMessage, setDialogMessage] = useState<string | undefined>(
    undefined
  );
  const cacheManagerRef = useRef<CacheManager>(
    new CacheManager(setDialogMessage)
  );
  const [summary, setSummary] = useState<ResponseSummary>({
    num_responses: 0,
    num_generated: 0,
    num_graded: 0,
    num_rubric: 0,
  });

  const triggerUpdate = useCallback(() => {
    const init: ResponseSummary = {
      num_responses: 0,
      num_generated: 0,
      num_graded: 0,
      num_rubric: cacheManagerRef.current.rubricRef?.settled ? 1 : 0,
    };
    const new_summary = cacheManagerRef.current.responseRefs.reduce(
      (prev, curr) => {
        prev.num_responses += 1;
        if (curr.finished_response) {
          prev.num_generated += 1;
        }
        if (curr.finished_analysis) {
          prev.num_graded += 1;
        }
        return prev;
      },
      init
    );
    setSummary(new_summary);
    if (new_summary.num_responses === new_summary.num_generated) {
      cacheManagerRef.current.responseRefs.sort(sortResponseData);
    }
  }, []);

  useEffect(() => {
    const cacheManager = cacheManagerRef.current;
    return () => {
      cacheManager.resetAllCaches();
    };
  }, []);

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
    try {
      cacheManagerRef.current.cacheHandleInputSubmit(
        inputSubmissionId,
        data,
        setSummary
      );
    } catch (e) {
      console.log("caught");
      //console.error(e);
    }
  };

  return (
    <InputContext.Provider value={{ cM: cacheManagerRef, triggerUpdate }}>
      <div>
        <ErrorDialog message={dialogMessage} setMessage={setDialogMessage} />
        <InputForm handleSubmit={handleSubmit} />
        <div className="pb-8 ">
          {submitted && (
            <>
              <div className="py-3 flex flex-col gap-2 sm:text-xl px-4 text-md">
                <SummaryStat
                  label="Responses Generated"
                  num={summary.num_generated}
                  outof={summary.num_responses}
                />
                <SummaryStat
                  label="Rubric"
                  num={summary.num_rubric}
                  outof={1}
                />
                <SummaryStat
                  label="Responses Graded"
                  num={summary.num_graded}
                  outof={summary.num_responses}
                />
              </div>
              <ResponseParent input_form={submitted.inputForm} />
            </>
          )}
        </div>
      </div>
    </InputContext.Provider>
  );
}

function SummaryStat({
  label,
  num,
  outof,
}: {
  label: string;
  num: number;
  outof: number;
}) {
  if (num == 0) {
    return (
      <h5 className="flex gap-4">
        {label}:
        <svg
          className="animate-spin -ml-1 mr-3 h-5 w-5 text-foreground"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </h5>
    );
  } else {
    return (
      <div>
        <h5>
          {label}: {num} / {outof}
        </h5>
      </div>
    );
  }
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
  const { cM } = useInputContext();

  return (
    <div className="last:border-b-2 last:rounded-lg last:border-input">
      <div className="grid grid-cols-[50%_50%] bg-card py-4 border-2 border-input border-b-0 rounded-t-lg">
        <h1 className="px-4 text-2xl border-r-2 border-input">Response</h1>
        <h1 className="px-4 text-2xl ">Analysis</h1>
      </div>
      {cM.current.responseRefs.map((response) => {
        return (
          <Response
            key={response.id}
            input_form={input_form}
            responseData={response}
          ></Response>
        );
      })}
    </div>
  );
};
const ResponseParent = React.memo(RP);

export interface ResponseData {
  id: string;
  response_model: z.infer<typeof models>;
  response: string;
  finished_response: boolean;
  analysis: string;
  finished_analysis: boolean;
  score: number | null;
}
export const sortResponseData = (a: ResponseData, b: ResponseData) => {
  if (a.score === null || b.score === null) {
    return a.id < b.id ? 1 : -1;
  }
  return b.score - a.score;
};

function calculateColor(value: number) {
  let r = (100 - value) * 2.0; // calculate red value (inverse of value)
  let g = value * 2.0; // calculate green value
  let b = 0; // blue value is set to 0 for simplicity

  r = Math.round(r);
  g = Math.round(g);

  // Convert each color component to a hexadecimal string and pad it if necessary
  let hexR = r.toString(16).padStart(2, "0");
  let hexG = g.toString(16).padStart(2, "0");
  let hexB = b.toString(16).padStart(2, "0");

  return `#${hexR}${hexG}${hexB}`;
}

const R = ({
  input_form,
  responseData,
}: {
  input_form: InputForm;
  responseData: ResponseData;
}) => {
  const [text, setText] = React.useState("");
  const [analysis, setAnalysis] = React.useState("");
  const [score, setScore] = React.useState<number | null>(null);
  const { cM, triggerUpdate } = useInputContext();
  useEffect(() => {
    cM.current.cacheRunChild(
      responseData.id,
      input_form.prompt,
      input_form.analysis_model,
      input_form.response_temperature,
      input_form.analysis_temperature,
      responseData,
      setText,
      setAnalysis,
      setScore,
      triggerUpdate
    );
  }, []);
  const { resolvedTheme } = useTheme();
  const styleObj =
    score !== null
      ? { color: calculateColor(score), borderColor: calculateColor(score) }
      : {};
  return (
    <div className="relative border-input bg-card max-h-[40vh] border-2 border-b-0 grid grid-cols-[50%_50%] py-8 *:border-input">
      <div className="absolute left-4 top-2 text-sm font-medium text-muted-foreground">
        {responseData.response_model}
      </div>
      <ScrollArea className="max-h-[calc(40vh-3rem)] overflow-auto border-r-2 px-4">
        <p
          className={`prose ${
            resolvedTheme === "light" ? "prose" : "prose-invert"
          }`}
        >
          <ReactMarkdown>{text}</ReactMarkdown>
        </p>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      <ScrollArea className="max-h-[calc(40vh-3rem)] overflow-auto px-4">
        <p
          className={`prose ${
            resolvedTheme === "light" ? "prose" : "prose-invert"
          }`}
        >
          <ReactMarkdown>{analysis}</ReactMarkdown>
        </p>
      </ScrollArea>
      <div className="absolute right-2 top-1 text-xl font-bold">
        <div
          className={`w-12 h-12 border-[1px] border-foreground flex justify-center items-center rounded-full bg-card`}
          style={styleObj}
        >
          <h1>{score === null ? "--" : score}</h1>
        </div>
      </div>
    </div>
  );
};
const Response = React.memo(R);
const models = z.enum(RESPONSE_MODEL_VALUES);
const responseOption = z.object({
  response_model: models,
  num_responses: z.coerce.number().positive().int(),
});
const inputForm = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  response_options: z.array(responseOption).min(1),
  analysis_model: z.enum(ANALYSIS_MODEL_VALUES),
  response_temperature: z.coerce.number().min(0).max(2),
  analysis_temperature: z.coerce.number().min(0).max(2),
});
export type InputForm = z.infer<typeof inputForm>;

function InputForm({
  handleSubmit,
}: {
  handleSubmit: (data: InputForm) => void;
}) {
  const handleResize = (event: any) => {
    const textarea = event.target;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  };
  const form = useForm<InputForm>({
    resolver: zodResolver(inputForm),
    defaultValues: {
      prompt: "",
      response_options: [
        { response_model: "gpt-5", num_responses: 5 },
      ],
      analysis_model: "gpt-4o-mini",
      response_temperature: 1.2,
      analysis_temperature: 0.0,
    },
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "response_options",
  });
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="px-4 py-4">
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
        <div className="flex gap-4 py-3 flex-col">
          <div className="space-y-2">
            <FormLabel className="text-xl font-normal">Response Models</FormLabel>
            <div className="border border-input rounded-lg overflow-hidden">
              <div className="grid grid-cols-[1fr_150px_80px] items-center bg-muted px-4 py-2 text-sm font-medium uppercase tracking-wide">
                <span>Model</span>
                <span className="text-right"># Responses</span>
                <span className="text-center">Actions</span>
              </div>
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid grid-cols-[1fr_150px_80px] items-center gap-2 border-t border-input px-4 py-3"
                >
                  <FormField
                    control={form.control}
                    name={`response_options.${index}.response_model`}
                    render={({ field }) => (
                      <FormItem>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {RESPONSE_MODEL_OPTIONS.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`response_options.${index}.num_responses`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input type="number" min={1} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-center">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  append({ response_model: "gpt-4o", num_responses: 5 })
                }
              >
                Add model
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <FormField
              control={form.control}
              name="analysis_model"
              render={({ field }) => (
                <FormItem className="flex flex-col gap-1">
                  <FormLabel className="text-xl font-normal">
                    Analysis Model
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ANALYSIS_MODEL_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="response_temperature"
              render={({ field }) => (
                <FormItem className="flex flex-col gap-1">
                  <FormLabel className="text-xl font-normal">
                    Response temperature
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="analysis_temperature"
              render={({ field }) => (
                <FormItem className="flex flex-col gap-1">
                  <FormLabel className="text-xl font-normal">
                    Analysis Temperature
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="mt-6">
              Submit
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}

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
