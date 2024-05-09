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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { v4 as uuidv4 } from "uuid";
import { CacheManager } from "./lodash";
import ReactMarkdown from "react-markdown";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

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
  const cacheManagerRef = useRef<CacheManager>(new CacheManager());
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
    cacheManagerRef.current.cacheHandleInputSubmit(
      inputSubmissionId,
      data,
      setSummary
    );
  };

  return (
    <InputContext.Provider value={{ cM: cacheManagerRef, triggerUpdate }}>
      <div>
        <nav className="flex items-center gap-4 flex-wrap py-6">
          <Button>History</Button>
        </nav>
        <InputForm handleSubmit={handleSubmit} />
        <div>
          {submitted && (
            <>
              {JSON.stringify(summary)}
              <ResponseParent input_form={submitted.inputForm} />
            </>
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
  const { cM } = useInputContext();

  return (
    <div>
      {cM.current.responseRefs.map((response) => {
        return (
          <Response
            key={response.id}
            prompt={input_form.prompt}
            model={input_form.model}
            data={response}
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
export const sortResponseData = (a: ResponseData, b: ResponseData) => {
  if (a.score === null || b.score === null) {
    return a.id < b.id ? 1 : -1;
  }
  return b.score - a.score;
};

const R = ({
  prompt,
  model,
  data,
}: {
  prompt: string;
  model: string;
  data: ResponseData;
}) => {
  const [text, setText] = React.useState("");
  const [analysis, setAnalysis] = React.useState("");
  const [score, setScore] = React.useState<number | null>(null);
  const { cM, triggerUpdate } = useInputContext();
  useEffect(() => {
    cM.current.cacheRunChild(
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
    <div className="border-red-300 max-h-[33vh] border-2 grid grid-cols-[45%_45%_10%] py-4 *:border-r-2 *:border-red-500">
      <ScrollArea className="max-h-[calc(33vh-1rem)] overflow-auto px-4">
        <h1>Response</h1>
        <p className="prose">
          <ReactMarkdown>{text}</ReactMarkdown>
        </p>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      <ScrollArea className="max-h-[calc(33vh-1rem)] overflow-auto px-4">
        <h1>Analysis</h1>
        <p className="prose">
          <ReactMarkdown>{analysis}</ReactMarkdown>
        </p>
      </ScrollArea>
      <ScrollArea className="max-h-[calc(33vh-1rem)] overflow-auto px-4">
        <h1>Score</h1>
        <p>{score}</p>
      </ScrollArea>
    </div>
  );
};
const Response = React.memo(R);

const inputForm = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  model: z.enum(["gpt-4-turbo", "gpt-3.5-turbo"]),
  num_responses: z.coerce.number().positive().int(),
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
      prompt: "Code me a function that does a react animation",
      num_responses: 20,
      model: "gpt-3.5-turbo",
    },
  });
  return (
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
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-36">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="gpt-4-turbo">GPT-4 turbo</SelectItem>
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
