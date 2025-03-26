import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  base: '/NewsFocus/', // 部署到 GitHub Pages 时资源的基础路径
  plugins: [vue()],
  server: {
    open: true, // 启动时自动在浏览器打开
  },
});
