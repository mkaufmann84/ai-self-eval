"use client";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import React, { useEffect, useState } from "react";
import { MdDarkMode, MdLightMode } from "react-icons/md";

export default function ChangeThemeButton() {
  const { resolvedTheme: theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) {
    return null;
  }
  return (
    <Button
      onClick={() => {
        if (theme === "light") {
          setTheme("dark");
        } else {
          setTheme("light");
        }
      }}
      variant={"secondary"}
      size={"icon"}
      className="hover:bg-secondary-hover "
    >
      {theme === "dark" ? (
        <MdDarkMode size={"1.375rem"} />
      ) : (
        <MdLightMode size={"1.375rem"} color="var(--foreground)" />
      )}
    </Button>
  );
}
