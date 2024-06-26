import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "./ThemeProvider";
import ChangeThemeButton from "./_components/ChangeTheme";
import { FaGithub } from "react-icons/fa";
import Link from "next/link";
import { Button } from "@/components/ui/button";
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "AI Self Eval",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={cn(
          "min-h-screen bg-background font-inter antialiased text-foreground",
          inter.variable
        )}
      >
        <ThemeProvider
          defaultTheme="system"
          enableSystem
          themes={["light", "dark"]}
          attribute="data-theme"
        >
          <div className="w-full bg-card h-16 flex justify-between py-2 px-[3vw] items-center">
            <h1 className="text-2xl font-bold">AI Self Eval</h1>
            <div className="flex items-center gap-4">
              <Link href="/" target="_blank">
                New Tab
              </Link>
              <Link href="https://github.com/mkaufmann84/ai-self-eval">
                <FaGithub size={"32px"} />
              </Link>
              <ChangeThemeButton />
            </div>
          </div>
          <div className="pt-10 sm:px-[8vw] px-[2vw]">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
}
