"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes/dist/types";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v13-appRouter";
import {
  Experimental_CssVarsProvider as CssVarsProvider,
  useColorScheme,
} from "@mui/material/styles";
import { experimental_extendTheme as extendTheme } from "@mui/material/styles";

/** Dark mode has to be added by overriding the css variables.
 *  I don't need to configure the tailwind because ths css variables will change, and tailwind references them.
 */

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      {/* <ThemeProviderMui>{children}</ThemeProviderMui> */}
      {children}
    </NextThemesProvider>
  );
}

/* const themeMui = extendTheme({}); */

/* function ThemeProviderMui({ children }: { children: React.ReactNode }) {
  console.log("ThemeProviderMui");
  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
      <CssVarsProvider defaultMode="dark" theme={themeMui}>
        <InnerMui>{children}</InnerMui>
      </CssVarsProvider>
    </AppRouterCacheProvider>
  );
}

function InnerMui({ children }: { children: React.ReactNode }) {
  const { mode, setMode } = useColorScheme();
  setMode("dark");
  console.log(mode);
  return children;
}
 */
