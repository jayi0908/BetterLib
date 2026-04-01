import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite"; // 1. 引入 tailwind 插件

export default defineConfig(async () => ({
  plugins: [
    react(),
    tailwindcss(), // 2. 启用插件
  ],
  clearScreen: false,
  server: {
    host: '0.0.0.0',
    port: 1420,
    strictPort: true,
  }
}));