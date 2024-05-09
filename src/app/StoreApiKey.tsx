"use client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import React from "react";
import { useForm } from "react-hook-form";
import { IoEyeOff } from "react-icons/io5";
import { IoEye } from "react-icons/io5";
import { z } from "zod";
import Cookies from "js-cookie";
import { COOKIES } from "@/constants";
const formSchema = z.object({ api_key: z.string() });
type FormSchema = z.infer<typeof formSchema>;

export default function StoreApiKey() {
  const [visible, setVisible] = React.useState(false);
  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: { api_key: Cookies.get(COOKIES.OPENAI_API_KEY) },
  });
  const onSubmit = (data: FormSchema) => {
    const res = Cookies.set(COOKIES.OPENAI_API_KEY, data.api_key);
    form.reset(data);
  };
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <h1 className="text-2xl">Open API Key</h1>
        <h5 className="text-sm text-gray-500">
          Your API key is only stored locally in your browser.
        </h5>
        <div className="flex gap-2 flex-col sm:flex-row">
          <div className="flex ">
            <Button
              size={"icon"}
              className="rounded-r-none bg-card border-input border-2 border-r-0"
              onClick={() => setVisible(!visible)}
            >
              {visible ? (
                <IoEyeOff size={"1.125rem"} />
              ) : (
                <IoEye size={"1.125rem"} />
              )}
            </Button>
            <FormField
              control={form.control}
              name="api_key"
              render={({ field }) => (
                <FormItem>
                  <Input
                    type={visible ? "text" : "password"}
                    placeholder="sk-"
                    className="min-w-[31rem] rounded-l-none"
                    {...field}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button
            type="submit"
            className={`transition duration-300 ${
              form.formState.isDirty
                ? "bg-primary"
                : "bg-background border-2 border-input text-gray-500"
            }`}
          >
            {form.formState.isDirty ? "Update" : "Updated"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
