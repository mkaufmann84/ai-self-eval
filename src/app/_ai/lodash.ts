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

const normalizedTemperature = (model: string, temperature: number) => {
  return model.startsWith("gpt-5") ? 1 : temperature;
};

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
      if (input_form.analysis_model === "skip") {
        this.rubricRef = {
          promise: Promise.resolve(""),
          settled: true,
        };
      } else {
        this.rubricRef = {
          promise: createRubric(
            input_form.prompt,
            input_form.analysis_model,
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
      }

      const totalResponses = input_form.response_options.reduce(
        (sum, option) => sum + option.num_responses,
        0
      );

      setSummary({
        num_responses: totalResponses,
        num_generated: 0,
        num_graded: 0,
        num_rubric: this.rubricRef?.settled ? 1 : 0,
      });

      input_form.response_options.forEach((option) => {
        for (let i = 0; i < option.num_responses; i++) {
          const response = {
            id: uuidv4(),
            response_model: option.response_model,
            response: "",
            finished_response: false,
            analysis: "",
            finished_analysis: false,
            score: null,
          };
          this.responseRefs.push(response);
        }
      });
      this.responseRefs.sort(sortResponseData);
    } catch (error) {
      this.setError("Error: " + error);
    }
  }

  public async runChild(
    key: string,
    prompt: string,
    analysis_model: string,
    response_temperature: number,
    analysis_temperature: number,
    responseRef: ResponseData,
    setText: React.Dispatch<React.SetStateAction<string>>,
    setAnalysis: React.Dispatch<React.SetStateAction<string>>,
    setScore: React.Dispatch<React.SetStateAction<number>>,
    triggerUpdate: () => void
  ) {
    try {
      const safeResponseTemperature = normalizedTemperature(
        responseRef.response_model,
        response_temperature
      );
      const response_stream = await getOpenAI().chat.completions.create({
        model: responseRef.response_model,
        messages: [{ role: "user", content: prompt }],
        stream: true,
        temperature: safeResponseTemperature,
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

      if (analysis_model === "skip") {
        responseRef.analysis = "Analysis skipped.";
        responseRef.finished_analysis = true;
        responseRef.score = 100;
        setAnalysis(responseRef.analysis);
        setScore(responseRef.score);
        triggerUpdate();
        return;
      }

      const rubric = (await this.rubricRef?.promise) ?? "";
      const analysis_messages: ChatCompletionMessageParam[] = [
        { role: "system", content: promptSystemAnalysis(rubric) },
        { role: "user", content: responseRef.response },
      ];
      const safeAnalysisTemperature = normalizedTemperature(
        analysis_model,
        analysis_temperature
      );
      const analysis_stream = await getOpenAI().chat.completions.create({
        model: analysis_model,
        messages: analysis_messages,
        stream: true,
        temperature: safeAnalysisTemperature,
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
        model: analysis_model,
        messages: messageScore(analysis_messages, responseRef.analysis),
        response_format: { type: "json_object" },
        temperature: safeAnalysisTemperature,
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
