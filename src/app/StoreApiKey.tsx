"use client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import Cookies from "js-cookie";
import React from "react";
import { useForm } from "react-hook-form";
import { IoEye, IoEyeOff } from "react-icons/io5";
import { z } from "zod";
import { COOKIES } from "@/constants";

const formSchema = z.object({ api_key: z.string().min(1, "API key is required") });
type FormSchema = z.infer<typeof formSchema>;

interface ApiKeyFormProps {
  label: string;
  description: string;
  placeholder: string;
  cookieKey: keyof typeof COOKIES;
}

function ApiKeyForm({ label, description, placeholder, cookieKey }: ApiKeyFormProps) {
  const [visible, setVisible] = React.useState(false);
  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: { api_key: Cookies.get(COOKIES[cookieKey]) ?? "" },
  });

  const onSubmit = (data: FormSchema) => {
    Cookies.set(COOKIES[cookieKey], data.api_key);
    form.reset(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold">{label}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex">
            <Button
              type="button"
              size="icon"
              className="rounded-r-none bg-card border-input border-2 border-r-0"
              onClick={() => setVisible((current) => !current)}
            >
              {visible ? <IoEyeOff size="1.125rem" /> : <IoEye size="1.125rem" />}
            </Button>
            <FormField
              control={form.control}
              name="api_key"
              render={({ field }) => (
                <FormItem>
                  <Input
                    type={visible ? "text" : "password"}
                    placeholder={placeholder}
                    className="min-w-[20rem] rounded-l-none"
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
                : "bg-background border-2 border-input text-muted-foreground"
            }`}
          >
            {form.formState.isDirty ? "Update" : "Updated"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default function StoreApiKey() {
  return (
    <div className="space-y-8">
      <ApiKeyForm
        label="OpenAI API Key"
        description="Stored locally in your browser and used for GPT models."
        placeholder="sk-..."
        cookieKey="OPENAI_API_KEY"
      />
      <ApiKeyForm
        label="Anthropic API Key"
        description="Stored locally and used for Claude models."
        placeholder="sk-ant-..."
        cookieKey="ANTHROPIC_API_KEY"
      />
    </div>
  );
}
