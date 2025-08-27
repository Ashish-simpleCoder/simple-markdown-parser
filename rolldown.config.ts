import { defineConfig } from 'rolldown';

export default defineConfig({
  input: "./src/MarkdownParser.tsx",
  output: [
    {
      format: "esm",
      file: "./src/MarkdownParser.js"
    }
  ],
  treeshake: false,
  watch: { clearScreen: true }
});