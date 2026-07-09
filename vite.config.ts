import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1];

export default defineConfig({
  plugins: [react()],
  base: repoName ? `/${repoName}/` : "/",
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        v1: "v1/index.html",
      },
    },
  },
});
