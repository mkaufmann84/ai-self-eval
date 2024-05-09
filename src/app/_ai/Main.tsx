"use client";
import { Button } from "@/components/ui/button";
import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
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
const formSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  model: z.enum(["gpt-4-turbo", "gpt-3.5-turbo"]),
  num_responses: z.coerce.number().positive().int(),
});
type FormSchema = z.infer<typeof formSchema>;

export default function Main() {
  const [state, setState] = React.useState("");
  const handleResize = (event: any) => {
    const textarea = event.target;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  };
  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: { prompt: "", num_responses: 1 },
  });
  const [submitted, setSubmitted] = useState<null | {
    formSchema: FormSchema;
    id: string;
  }>(null);
  const handleSubmit = (data: FormSchema) => {
    setSubmitted({ formSchema: data, id: uuidv4() });
  };

  return (
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
      <div>
        {submitted && (
          /* I can change thetype of this */
          <ResponseParent
            input_form={submitted.formSchema}
            id={submitted.id}
          ></ResponseParent>
        )}
      </div>
    </div>
  );
}
interface ResponseSummary {
  num_responses: number;
  num_generated: number;
  num_graded: number;
  num_rubric: number;
}
interface ResponseParentProps {
  input_form: FormSchema;
  id: string;
}
type RubricRef = { promise: Promise<string>; settled: boolean } | undefined;

const RP = ({ input_form, id }: ResponseParentProps) => {
  console.log("rendering parent", id);
  const responseRefs = useRef<ResponseData[]>([]);
  const [summary, setSummary] = useState<ResponseSummary>({
    num_responses: input_form?.num_responses ?? 0,
    num_generated: 0,
    num_graded: 0,
    num_rubric: 0,
  });
  const rubricRef = useRef<RubricRef>();
  useEffect(() => {
    const run = async () => {
      console.log("running");
      rubricRef.current = {
        promise: createRubric(input_form.prompt, input_form.model),
        settled: false,
      };
      rubricRef.current.promise.then((rubric: string) => {
        rubricRef.current!.settled = true;
        setSummary((prev) => {
          return { ...prev, num_rubric: 1 };
        });
      });
    };
    setSummary({
      num_responses: input_form.num_responses,
      num_generated: 0,
      num_graded: 0,
      num_rubric: 0,
    });
    run();
    for (
      let i = responseRefs.current.length;
      i < input_form.num_responses;
      i++
    ) {
      const response = {
        id: uuidv4(),
        response: "",
        finished_response: false,
        analysis: "",
        finished_analysis: false,
        score: null,
      };
      responseRefs.current.push(response);
    }
    responseRefs.current.sort((a, b) => {
      if (a.score === null || b.score === null) {
        return a.id < b.id ? -1 : 1;
      }
      return a.score - b.score;
    });
  }, []);

  //in order to trigger a re-render, the child component will use the setSummary.
  //I'd rather have the values be inferred though. Maybe have a useCallback()() that recalculates the summary.
  const triggerUpdate = useCallback(() => {
    const init: ResponseSummary = {
      num_responses: 0,
      num_generated: 0,
      num_graded: 0,
      num_rubric: rubricRef.current?.settled ? 1 : 0,
    };
    const new_summary = responseRefs.current.reduce((prev, curr) => {
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
      {responseRefs.current.map((response) => {
        console.log("mapping    " + response.id);
        return (
          <Response
            key={response.id}
            prompt={input_form.prompt}
            model={input_form.model}
            data={response}
            rubricRef={rubricRef}
            triggerUpdate={triggerUpdate}
          ></Response>
        );
      })}
    </div>
  );
};
const ResponseParent = React.memo(RP);

interface ResponseData {
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
  rubricRef,
  triggerUpdate,
}: {
  prompt: string;
  model: string;
  data: ResponseData;
  rubricRef: React.MutableRefObject<RubricRef>;
  triggerUpdate: () => void;
}) => {
  const [text, setText] = React.useState("");
  const [analysis, setAnalysis] = React.useState("");
  const [score, setScore] = React.useState<number | null>(null);
  useEffect(() => {
    const render = async () => {
      console.log("starting child");
      const response_stream = await getOpenAI().chat.completions.create(
        {
          model: model,
          messages: [{ role: "user", content: prompt }],
          stream: true,
        },
        { idempotencyKey: data.id }
      );
      for await (const chunk of response_stream) {
        if (chunk.choices[0].finish_reason === "stop") {
          console.log("STOPIG");
          break;
        }
        console.log(chunk.choices[0].delta.content);
        data.response = data.response + chunk.choices[0].delta.content ?? "";
        setText(data.response);
      }
      console.log("response", data.response);
      data.finished_response = true;
      triggerUpdate();

      const rubric = (await rubricRef.current?.promise) ?? "";

      const analysis_messages: ChatCompletionMessageParam[] = [
        { role: "system", content: promptSystemAnalysis(rubric) },
        { role: "user", content: data.response },
      ];
      const analysis_stream = await getOpenAI().chat.completions.create({
        model: model,
        messages: analysis_messages,
        stream: true,
      });
      for await (const chunk of analysis_stream) {
        data.analysis = data.analysis + chunk.choices[0]?.delta?.content ?? "";
      }
      data.finished_analysis = true;
      setAnalysis(data.analysis);
      triggerUpdate();

      const score_text = await getOpenAI().chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: messageScore(analysis_messages, data.analysis),
        response_format: { type: "json_object" },
      });
      let score;
      try {
        const score_json = JSON.parse(
          score_text.choices[0].message.content ?? "{}"
        );
        score = validateAndConvert(score_json.score);
        data.score = score;
      } catch {
        data.score = 0;
      } finally {
        setScore(data.score);
        triggerUpdate();
      }
    };
    render();
  }, []);

  return (
    <div className="border-red-300 border-2 p-4">
      <h1>Response</h1>
      <p>{text}</p>
      <div className="w-full h-2 my-20 bg-slate-500 "></div>
      <h1>Analysis</h1>
      <p>{analysis}</p>
      <div className="w-full h-2 my-20 bg-slate-500 "></div>
      <h1>Score</h1>
      <p>{score}</p>
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
