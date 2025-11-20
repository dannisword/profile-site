## 1. 封裝 Axios 模組
封裝一個專案共用的 axios instance，統一：
- 後端 API base URL (VITE_BASE_API)
- 預設 timeout
-  預設 Content-Type
- 全域 Loading 狀態控制（搭配 useLoadingStore）
- 預留「靜默錯誤」(meta.silent) 的設定（未在本檔中實作錯誤提示，只是先定義在 config 上）

--- 

## 2. Axios 設定擴充 (TypeScript 宣告合併)
```
declare module "axios" {
  interface AxiosRequestConfig {
    meta?: {
      /** 預設 true；false 可關閉這筆請求的全域 loading */
      loading?: boolean;
      /** true 則不彈錯誤提示 */
      silent?: boolean;
    };
    loadingId?: number; // 內部使用：追蹤這筆請求的 id
  }
}
```
### 2.1 meta.loading?: boolean
- 用途：控制此 request 是否要觸發「全域 loading」動畫。
- 預設：未設定或 true → 會加入 loading 機制。
- 設為 false 時：
    - 不會啟動 useLoadingStore().start() / stop()
    - 不會被 registerLoading / unregisterLoading 納入 activeIds

使用範例：
```
service.get("/users", {
  meta: { loading: false },
});
```
### 2.2 meta.silent?: boolean
- 用途：標記這筆 request 的錯誤是否要「靜默」處理（不彈錯誤提示）。
- 目前狀態：此欄位僅定義在 AxiosRequestConfig，方便後續在 全域錯誤攔截器 或 自訂錯誤處理模組 中使用，但本檔案沒有實作對 silent 的處理邏輯。
預期使用方式（未來）：
```
service.get("/users", {
  meta: { silent: true },
});
```
之後可在 response 的 error interceptor 中判斷 error.config.meta?.silent 來決定是否顯示 UI 訊息。
### 2.3 loadingId?: number
- 用途：內部用來追蹤單一 request 的 ID。
- 為每一筆有啟用 loading 的請求分配一個遞增的 idSeq。
- 用來在請求完成或失敗時，從 activeIds 中移除對應的 id。

--- 

## 3. Axios Instance 基本設定
```
const service = axios.create({
  baseURL: import.meta.env.VITE_BASE_API,
  timeout: 5000,
});
```
- baseURL：走 .env 中的 VITE_BASE_API，所有相對路徑的 API 都會以此為前綴。
- timeout：預設 5000 ms，超時會拋出錯誤，並觸發 response error interceptor。

--- 

## 4. 全域 Loading 控制邏輯
### 4.1 變數說明
```
let idSeq = 0;                   // 遞增序號，用來產生 loadingId
const activeIds = new Set<number>(); // 正在進行中的 request id 列表
```
- idSeq：每次註冊 loading 時 +1，保證 id 唯一。
- activeIds：記錄目前所有「啟用 loading」的 request。
### 4.2 startIfNeeded(cfg?: AxiosRequestConfig)
```
function startIfNeeded(cfg?: AxiosRequestConfig) {
  if (cfg?.meta?.loading === false) {
    return;
  }
  const store = useLoadingStore();
  if (activeIds.size === 0) {
    store.start();
  }
}
```
- 若 meta.loading === false → 直接 return。
- 若這是 第一筆 需要 loading 的 request（activeIds.size === 0）：
    - 呼叫 useLoadingStore().start() 開啟全域 loading。
### 4.3 stopIfNeeded(cfg?: AxiosRequestConfig)
```
function stopIfNeeded(cfg?: AxiosRequestConfig) {
  if (cfg?.meta?.loading === false) {
    return;
  }
  const store = useLoadingStore();
  if (activeIds.size === 0) {
    store.stop();
  }
}
```
- 會先檢查 meta.loading === false。
- 在 activeIds 清空後，才會呼叫 useLoadingStore().stop() 關閉全域 loading。
- 搭配 unregisterLoading 使用，確保 所有正在進行的 request 都完成後 才結束 loading。
### 4.4 registerLoading(cfg: AxiosRequestConfig)
```
function registerLoading(cfg: AxiosRequestConfig) {
  if (cfg.meta?.loading === false) {
    return;
  }
  const id = ++idSeq;
  cfg.loadingId = id;
  startIfNeeded(cfg);
  activeIds.add(id);
}
```
- 若 meta.loading === false → 不註冊。
- 否則：
    - 產生新的 loadingId
    - 寫回到 config.loadingId
    - 若是第一筆 loading → 呼叫 startIfNeeded → 可能觸發 store.start()
    - 把此 id 加入 activeIds
### 4.5 unregisterLoading(cfg?: AxiosRequestConfig)
```
function unregisterLoading(cfg?: AxiosRequestConfig) {
  if (!cfg || cfg.meta?.loading === false) {
    return;
  }
  if (cfg.loadingId != null) {
    activeIds.delete(cfg.loadingId);
  }
  stopIfNeeded(cfg);
}
```
- 若 cfg 不存在或 meta.loading === false → 直接 return。
- 否則：
    1.依照 cfg.loadingId 從 activeIds 中移除該 id
    2.呼叫 stopIfNeeded → 若 activeIds 已為空，就會觸發 store.stop() 結束 loading

--- 

## 5.Request Interceptor 行為
```
service.interceptors.request.use(
  (config) => {
    if (!config.headers["Content-Type"]) {
      config.headers["Content-Type"] = "application/json";
    }
    registerLoading(config);
    return config;
  },
  (error) => {
    unregisterLoading(error.config);
    return Promise.reject(error);
  }
);
```
- 成功進入 request interceptor 時：
    - 若 headers['Content-Type'] 未被設定，預設為 "application/json"。
    - 呼叫 registerLoading(config)，可能啟動全域 loading。

- request 發生錯誤（例如 config 生成階段錯誤）時：
    - 呼叫 unregisterLoading(error.config) 解除 loading 狀態。
    - 回傳 Promise.reject(error)，讓呼叫端自行處理。

## 6.Response Interceptor 行為
```
service.interceptors.response.use(
  (response) => {
    unregisterLoading(response.config);
    return Promise.resolve(response.data);
  },
  (error) => {
    unregisterLoading(error.config);
    return Promise.reject(error);
  }
);
```
- 成功回應：
    - 呼叫 unregisterLoading(response.config)，移除該 request 的 loadingId，必要時結束全域 loading。
    - 回傳 response.data（而非整個 response），呼叫端拿到的就是後端回傳的資料。

- 錯誤回應：
    - 一樣呼叫 unregisterLoading(error.config) 做 loading 清理。
    - 直接 Promise.reject(error) 丟回 error，使用端可以透過 try/catch 或 .catch() 處理錯誤。

---

## 7. 封裝 request的 httpOperations
### 7.1 用途：
- 統一 GET / POST / PUT / DELETE 的呼叫介面
- 自動處理：
    - URL 編碼（encodeURI）
    - Query String 參數中 字串的編碼（encodeURIComponent）
- 共用錯誤處理邏輯：
    - 針對部分 HTTP Status 顯示提示視窗（TLWarning）
    - 呼叫端收到失敗的 Promise（reject({ successful: false })）
### 7.2 錯誤處理：handleError
```
const handleError = (e: any) => {
  if (e.status) {
    var msg = "";
    if (e.status == "400") {
      msg = "400 Bad Request";
    }
    if (e.status == "401") {
      msg = "401 Unauthorized";
    }
    if (e.status == "405") {
      msg = "Method Not Allowed";
    }
    TLWarning(msg);
    return {
      success: false,
      message: msg,
    };
  }
};
```
- 接收錯誤物件 e（通常是 axios 的錯誤）。
- 若 e.status 存在：
    - 依照 status code 轉成預設英文訊息：
        - 400 → "400 Bad Request"
        - 401 → "401 Unauthorized"
        - 405 → "Method Not Allowed"

    - 呼叫 TLWarning(msg) 顯示 Warning 訊息。
    - 回傳：
        ```
        {
        success: false,
        message: msg,
        }
        ```
- 若 e.status 不存在：不做任何事，回傳 undefined。
### 7.3 httpOperations 介面說明
```
const httpOperations = {
  get(url: any, params: any = undefined) { ... },
  post(url: any, data: any = undefined) { ... },
  put(url: any, data: any = undefined) { ... },
  delete(url: any, data: any = undefined) { ... },
};

export default httpOperations;
```
- 四種方法都回傳一個 新的 Promise，不是直接回傳 request(...)。
- 成功時：resolve(response)（response 即 request 的回傳結果，一般是後端的 data）。
- 失敗時：
    - 先呼叫 handleError(e) 做 UI 提示
    - 再 reject({ successful: false })
### 7.4 get(url, params?)
```
get(url: any, params: any = undefined) {
  return new Promise((resolve, reject) => {
    const encodeUrl = encodeURI(url);
    url = encodeUrl;
    if (!isEmptyOrNull(params)) {
      const encodeParams: Record<string, any> = Object.fromEntries(
        Object.entries(params).map(([key, value]) => [
          key,
          typeof value === "string" ? encodeURIComponent(value) : value,
        ])
      );
      params = encodeParams;
    }
    request({
      url: url,
      method: "GET",
      params: params,
    })
      .then((response: any) => {
        resolve(response);
      })
      .catch((e: any) => {
        handleError(e);
        reject({ successful: false });
      });
  });
}
```
- 參數
    - url: any
    - 會先經過 encodeURI(url)，確保整體 URL 沒有非法字元。
- params?: Record<string, any>
    - 若 isEmptyOrNull(params) 為 false，則會進一步對「值為字串」的欄位做 encodeURIComponent。

- URL / Query 編碼策略
    - url：整體用 encodeURI 編碼一次。
    - params：
        - 對 string 型別的值做 encodeURIComponent(value)。
        - 非字串（數字、布林、物件等）保持原樣。

-  回傳 
    - resolve(response)：
        - response 即 request(...) 的回傳值（依照前一支 request.ts 的設計，應該是 response.data）。

    - reject({ successful: false })：
    - 代表整體操作失敗，且已經由 handleError 顯示視覺提示。
### 7.5 post(url, data?)
```
post(url: any, data: any = undefined) {
  return new Promise((resolve, reject) => {
    request({
      url: url,
      method: "POST",
      data,
    })
      .then((response: any) => {
        resolve(response);
      })
      .catch((e: any) => {
        handleError(e);
        reject({ successful: false });
      });
  });
}
```
- 不處理 URL / 參數編碼。
- 直接將 data 當作 request body 傳給後端。
- 成功 / 錯誤處理同 GET。

### 7.6 put(url, data?)
```
put(url: any, data: any = undefined) {
  return new Promise((resolve, reject) => {
    request({
      url: url,
      method: "PUT",
      data,
    })
      .then((response: any) => {
        resolve(response);
      })
      .catch((e: any) => {
        handleError(e);
        reject({ successful: false });
      });
  });
}
```
- 與 post 幾乎相同，只是 HTTP method 換成 PUT。
- 用於更新資源。

### 7.7 delete(url, data?)
```
delete(url: any, data: any = undefined) {
  return new Promise((resolve, reject) => {
    request({
      url: url,
      method: "DELETE",
      data,
    })
      .then((response: any) => {
        resolve(response);
      })
      .catch((e) => {
        handleError(e);
        reject({ successful: false });
      });
  });
}
```
- 用於刪除資源。
- 同樣支援 data 當作 request body（實務上有些 API 會在 DELETE 傳 body 條件）。
### 7.8 使用範例
- 取得資料（含查詢參數）
```
import http from "../httpOperations";

async function loadUsers() {
  try {
    const res = await http.get("/api/users", {
      keyword: "台北倉庫", // 這裡會被 encodeURIComponent
      page: 1,            // number 不會被 encode
    });
    console.log(res);
  } catch (e) {
    // e = { successful: false }
  }
}
```
- 新增資料
```
async function createUser(payload: any) {
  try {
    const res = await http.post("/api/users", payload);
    return res;
  } catch {
    // 已經有 TLWarning 顯示錯誤
  }
}
```

