# 這個結構是現代前端開發中常見且推薦的模式，它強調模組化、可維護性和擴展性

## Vite + Vue 3 專案架構與目錄結構
1. 專案初始化 (使用 Vite)
使用 Vite 官方推薦的方式快速建立一個基礎專案：
```
# 建立專案
npm create vite@latest <your-project-name> -- --template vue-ts

# 初始化 Yarn
yarn init -y

# 安裝依賴 (將會建立 yarn.lock)
yarn install
```
2. 主要目錄結構
```
<your-project-name>/
├── node_modules/         
├── public/               
├── src/                  
│   ├── assets/           
│   ├── components/       
│   ├── hooks/            
│   ├── layouts/          
│   ├── router/           
│   ├── stores/           # Pinia 狀態管理           
│   ├── views/            
│   ├── App.vue           
│   └── main.ts           
├── index.html            
├── package.json          
├── **yarn.lock** # 使用 Yarn 時會產生此文件
└── vite.config.ts
```
3. 常見 Yarn 命令

```
# 安裝所有依賴
yarn 或 yarn install

# 安裝新依賴
yarn add [package]

# 安裝開發依賴
yarn add [package] --dev

# 運行腳本
yarn [script-name]

# 刪除依賴
yarn remove [package]
```