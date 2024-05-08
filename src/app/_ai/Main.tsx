import { Button } from "@/components/ui/button";
import React from "react";
import { test } from "./nlp";
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

const formSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  model: z.enum(["gpt-4-turbo", "gpt-3.5-turbo"]),
  num_responses: z.coerce.number().positive(),
});
type FormSchema = z.infer<typeof formSchema>;
export default function Main() {
  const [state, setState] = React.useState("");
  const handleResize = (event: any) => {
    const textarea = event.target;
    textarea.style.height = "auto"; // Reset height to recalculate
    textarea.style.height = `${textarea.scrollHeight}px`; // Set new height
  };
  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: { prompt: "", num_responses: 1 },
  });
  return (
    <div>
      <nav className="flex items-center gap-4 flex-wrap py-6">
        <Button>History</Button>
        <Button
          onClick={async () => {
            const res = await test(Cookies.get(COOKIES.OPENAI_API_KEY) ?? "");
            console.log(res);
            setState(res ?? "failed");
          }}
        >
          Click me
        </Button>
      </nav>
      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => console.log(data))}>
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
      {state.length}
      {state}
    </div>
  );
}
