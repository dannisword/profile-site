# Vue 3 + TypeScript + Vite

This template should help get you started developing with Vue 3 and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about the recommended Project Setup and IDE Support in the [Vue Docs TypeScript Guide](https://vuejs.org/guide/typescript/overview.html#project-setup).


## tailwind
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

npx 的 init -p 會建立 tailwind.config.cjs 和 postcss.config.cjs。

## GitHub Actions 自動幫你 build + 部署到 GitHub Pages
如果是「個人首頁 repo」 vs 「一般專案」

個人首頁：repo 名稱是
你的帳號.github.io
→ 網址會是 https://你的帳號.github.io/
→ vite.config.ts 裡 base 要設成 /

一般專案：repo 名稱是
profile-site
→ 網址會是 https://你的帳號.github.io/profile-site/
→ vite.config.ts 裡 base 要設成：
```
export default defineConfig({
  base: '/profile-site/',
  // ...
});
```

在專案裡建立資料夾：.github/workflows/

新增檔案：.github/workflows/deploy.yml
```
name: Deploy Profile Site to GitHub Pages

on:
  push:
    branches: [ main ]   # 你主要開發的分支，如果不是 main 就改成你的分支

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      # 把 dist 資料夾打包成 Pages Artifact
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4

```