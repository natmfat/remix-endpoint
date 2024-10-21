import react from "@vitejs/plugin-react";
import * as glob from "glob";
import path from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tsconfigPaths(),
    react(),
    dts({
      tsconfigPath: "./tsconfig.app.json",
      include: ["src"],
      exclude: ["node_modules/**"],
    }),
  ],
  build: {
    minify: "esbuild",
    lib: {
      entry: {
        index: path.resolve(__dirname, "src/index.ts"),
      },
      formats: ["es"],
    },
    rollupOptions: {
      external: [
        "react",
        "react/jsx-runtime",
        "react-dom",
        "zod",
        "@remix-run/node",
      ],
      input: Object.fromEntries(
        glob
          .sync(["src/react/**/!(*.d).{ts,tsx}", "src/index.ts"])
          .map((file) => [
            path.relative(
              "src",
              file.substring(0, file.length - path.extname(file).length),
            ),
            path.resolve(__dirname, file),
          ]),
      ),
      output: {
        assetFileNames: "assets/[name][extname]",
        globals: {
          react: "React",
          "react/jsx-runtime": "react/jsx-runtime",
          "react-dom": "ReactDOM",
        },
      },
    },
    copyPublicDir: false,
  },
});
