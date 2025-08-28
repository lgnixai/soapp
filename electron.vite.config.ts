import { resolve } from "path";
import { defineConfig, ElectronViteConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const mainAliases: Record<string, string> = {
  "@": resolve("src/main")
};

const rendererAliases: Record<string, string> = {
  "@": resolve("src/renderer/src")
};

const sharedAliases: Record<string, string> = {
  "~": resolve("src/shared")
};

const commonOptions: Partial<ElectronViteConfig["main"]> = {
  build: {
    minify: "esbuild"
  }
};

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: ["electron-context-menu"] })],
    resolve: {
      alias: {
        ...mainAliases,
        ...sharedAliases
      }
    },
    ...commonOptions
  },
  preload: {
    plugins: [externalizeDepsPlugin({ exclude: ["electron-chrome-extensions"] })],
    resolve: {
      alias: {
        ...mainAliases,
        ...sharedAliases
      }
    },
    ...commonOptions
  },
  renderer: {
    resolve: {
      alias: {
        ...rendererAliases,
        ...sharedAliases
      }
    },
    plugins: [react(), tailwindcss()],
    ...commonOptions
  }
});
