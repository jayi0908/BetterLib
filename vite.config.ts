import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite"; // 1. 引入 tailwind 插件

export default defineConfig(async () => ({
  plugins: [
    react(),
    tailwindcss(), // 2. 启用插件
  ],
  // ... 下面是 Tauri 默认生成的其他配置，保持原样即可 ...
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  }
}));