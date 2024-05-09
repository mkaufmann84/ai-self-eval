import { memoize } from "lodash-es";
import { InputForm, ResponseData, ResponseSummary, RubricRef } from "./Main";
import { createRubric } from "./nlp";
import { v4 as uuidv4 } from "uuid";

/*When I want to re-render (change ui), I use a state.  */

export class CacheManager {
  public cacheHandleInputSubmit: ReturnType<typeof memoize>;
  public rubricRef: RubricRef;
  public responseRefs: ResponseData[] = [];
  constructor() {
    this.cacheHandleInputSubmit = memoize(this.handleInputSubmit);
  }
  /** Called when a form is submitted. */
  public handleInputSubmit(
    key: string,
    input_form: InputForm,
    setSummary: React.Dispatch<React.SetStateAction<ResponseSummary>>
  ) {
    console.log("handleInputSubmit called", key, input_form);
    this.rubricRef = {
      promise: createRubric(input_form.prompt, input_form.model),
      settled: false,
    };
    this.rubricRef.promise.then((rubric: string) => {
      this.rubricRef!.settled = true;
      setSummary((prev) => {
        return { ...prev, num_rubric: 1 };
      });
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
    this.responseRefs.sort((a, b) => {
      if (a.score === null || b.score === null) {
        return a.id < b.id ? -1 : 1;
      }
      return a.score - b.score;
    });
  }

  resetAllCaches() {
    if (this.cacheHandleInputSubmit.cache.clear) {
      this.cacheHandleInputSubmit.cache.clear();
    }
  }
}

export const testMemo = memoize((key, arg1) => {
  console.log("testMemo called", key, arg1);
  return null;
});
