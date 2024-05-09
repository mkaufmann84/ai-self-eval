import { memoize } from "lodash-es";
import {
  InputForm,
  ResponseData,
  ResponseSummary,
  RubricRef,
  sortResponseData,
} from "./Main";
import {
  createRubric,
  getOpenAI,
  messageScore,
  promptSystemAnalysis,
  validateAndConvert,
} from "./nlp";
import { v4 as uuidv4 } from "uuid";
import { ChatCompletionMessageParam } from "openai/resources/index.mjs";

/*When I want to re-render (change ui), I use a state.  */

export class CacheManager {
  public cacheHandleInputSubmit: ReturnType<typeof memoize>;
  public cacheRunChild: ReturnType<typeof memoize>;
  public rubricRef: RubricRef;
  public responseRefs: ResponseData[] = [];
  public setError: React.Dispatch<React.SetStateAction<string | undefined>>;
  constructor(
    setError: React.Dispatch<React.SetStateAction<string | undefined>>
  ) {
    this.cacheHandleInputSubmit = memoize(this.handleInputSubmit);
    this.cacheRunChild = memoize(this.runChild);
    this.setError = setError;
  }
  /** Called when a form is submitted. */
  public handleInputSubmit(
    key: string,
    input_form: InputForm,
    setSummary: React.Dispatch<React.SetStateAction<ResponseSummary>>
  ) {
    try {
      this.responseRefs = [];
      this.rubricRef = {
        promise: createRubric(
          input_form.prompt,
          input_form.model,
          input_form.analysis_temperature
        ),
        settled: false,
      };
      this.rubricRef.promise.then((rubric: string) => {
        this.rubricRef!.settled = true;
        setSummary((prev) => {
          return { ...prev, num_rubric: 1 };
        });
      });
      this.rubricRef.promise.catch((error) => {
        this.setError("Error: " + error);
      });

      setSummary({
        num_responses: input_form.num_responses,
        num_generated: 0,
        num_graded: 0,
        num_rubric: 0,
      });

      for (
        let i = 0; //let i = responseRefs.current.length;
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
        this.responseRefs.push(response);
      }
      this.responseRefs.sort(sortResponseData);
    } catch (error) {
      this.setError("Error: " + error);
    }
  }

  public async runChild(
    key: string,
    prompt: string,
    model: string,
    response_temperature: number,
    analysis_temperature: number,
    responseRef: ResponseData,
    setText: React.Dispatch<React.SetStateAction<string>>,
    setAnalysis: React.Dispatch<React.SetStateAction<string>>,
    setScore: React.Dispatch<React.SetStateAction<number>>,
    triggerUpdate: () => void
  ) {
    try {
      const response_stream = await getOpenAI().chat.completions.create({
        model: model,
        messages: [{ role: "user", content: prompt }],
        stream: true,
        temperature: response_temperature,
      });
      for await (const chunk of response_stream) {
        if (chunk.choices[0].finish_reason === "stop") {
          break;
        }
        responseRef.response =
          responseRef.response + chunk.choices[0]?.delta?.content ?? "";
        setText(responseRef.response);
      }
      responseRef.finished_response = true;
      triggerUpdate();

      const rubric = (await this.rubricRef?.promise) ?? "";
      const analysis_messages: ChatCompletionMessageParam[] = [
        { role: "system", content: promptSystemAnalysis(rubric) },
        { role: "user", content: responseRef.response },
      ];
      const analysis_stream = await getOpenAI().chat.completions.create({
        model: model,
        messages: analysis_messages,
        stream: true,
        temperature: analysis_temperature,
      });
      for await (const chunk of analysis_stream) {
        if (chunk.choices[0].finish_reason === "stop") {
          break;
        }
        responseRef.analysis =
          responseRef.analysis + chunk.choices[0]?.delta?.content ?? "";
      }
      responseRef.finished_analysis = true;
      setAnalysis(responseRef.analysis);
      triggerUpdate();

      const score_text = await getOpenAI().chat.completions.create({
        model: model,
        messages: messageScore(analysis_messages, responseRef.analysis),
        response_format: { type: "json_object" },
        temperature: analysis_temperature,
      });
      let score;
      try {
        const score_json = JSON.parse(
          score_text.choices[0].message.content ?? "{}"
        );
        score = validateAndConvert(score_json.score);
        responseRef.score = score;
      } catch {
        responseRef.score = 0;
      } finally {
        setScore(responseRef.score ?? 0);
        triggerUpdate();
      }
    } catch (error) {
      this.setError("Error: " + error);
    }
  }

  resetAllCaches() {
    this.responseRefs = [];
    this.rubricRef = undefined;
    if (this.cacheHandleInputSubmit.cache.clear) {
      this.cacheHandleInputSubmit.cache.clear();
    }
    if (this.cacheRunChild.cache.clear) {
      this.cacheRunChild.cache.clear();
    }
  }
}
