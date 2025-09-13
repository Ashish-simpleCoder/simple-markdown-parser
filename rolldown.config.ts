import { defineConfig } from 'rolldown';

export default defineConfig([
  {
    input: "./src/MarkdownParser.tsx",
    output: [
      {
        format: "esm",
        file: "./src/MarkdownParser.js"
      }
    ],
    treeshake: false,
  },
  {
    input: "./src/parseList.tsx",
    output: [
      {
        format: "esm",
        file: "./src/parseList.js"
      }
    ],
    treeshake: false,
  }
]);