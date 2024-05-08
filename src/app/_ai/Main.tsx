import { Button } from "@/components/ui/button";
import React from "react";
import { test } from "./nlp";
import Cookies from "js-cookie";
import { COOKIES } from "@/constants";
export default function Main() {
  const [state, setState] = React.useState("");
  return (
    <div>
      Main
      <Button
        onClick={async () => {
          const res = await test(Cookies.get(COOKIES.OPENAI_API_KEY) ?? "");
          console.log(res);
          setState(res ?? "failed");
        }}
      >
        Click me
      </Button>
      {state.length}
      {state}
    </div>
  );
}
