## 1. Nginx proxy
### 1.1 目的
此 Nginx server 區塊用來做 反向代理 (Reverse Proxy)：
對外開放 HTTP 80 port，接收到任何路徑 (/ 開頭) 的請求後，全部轉送到 後端服務 api-gateway:8080。
### 1.2 用途：
- 將後端 .NET / Java API Gateway 隱藏在內網，只對外暴露 Nginx。
- 之後可以在 Nginx 增加 SSL / 負載平衡 / 壓縮 / Cache 等功能。
### 1.3 設定內容說明
```
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://api-gateway:8080; // 主機名稱
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
    }
}
```
- listen 80;
    - 代表這個 server 區塊監聽 80 port（HTTP 預設 port）。
    - 使用者在瀏覽器輸入 http://<server-ip> 的請求會被這個區塊處理。
- server_name _;
    - server_name 用來比對 Host 名稱（例如 example.com）。
    - 這裡使用 _，通常代表「預設主機」，也就是：只要沒有其他 server_name 更符合，就會落到這個設定。

- location / { ... }
    - location / 代表「匹配所有路徑」，例如：
        - /
        - /api/auth/login
        - /swagger/index.html
    - 所有路徑都會進到這個 block 裡做反向代理。
- proxy_pass http://api-gateway:8080;
    - 將前端接收到的請求，轉發到 後端服務 api-gateway:8080。
    - api-gateway 通常是：
        - Docker Compose service 名稱，或
        - 內網 DNS / Hostname。
    - 8080 為後端服務啟動的 port。
- proxy_set_header Host $host;
    - 將前端請求的 Host（例如 example.com）傳給後端。
    - 有些應用會依 Host 做 Routing 或產 Log，所以保留原始 Host 很重要。
- proxy_set_header X-Forwarded-For $remote_addr;
    - 把 原始 Client IP 放進 X-Forwarded-For header。
    - 後端服務可以用這個 header 知道真實使用者 IP（而不是只看到 Nginx 的 IP）。
- proxy_set_header X-Forwarded-Proto $scheme;
    - 將前端請求的通訊協定（http 或 https）傳給後端。
    - 當你在外面用 HTTPS（Nginx 做 TLS 終結），後端可以知道原本是 https，常用於：
        - 產生正確的回傳 URL
        - 產生 redirect link（避免 http/https 亂跳）
- proxy_set_header X-Forwarded-Host $host;
    - 將原始的 Host 放在 X-Forwarded-Host 裡。
    - 某些 Framework / Middleware 會使用這個 header 來產生完整 URL 或 Log。
### 1.4 流程
- 使用者 → http://your-nginx-ip/api/Auth/login
- Nginx 收到請求：
    - Listener：80
    - 進入 server_name _ 的 server
    - 進入 location /
- Nginx 轉發請求到：http://api-gateway:8080/api/Auth/login
    - 帶上：
        - Host: <原始 Host>
        - X-Forwarded-For: <使用者 IP>
        - X-Forwarded-Proto: http
        - X-Forwarded-Host: <原始 Host>
- API Gateway 回應 → Nginx → 使用者。

## 2.API Gateway 設定檔說明文件
提供 API Gateway 的設定架構、用途與開發需要注意的技術細節。

## appsettings.json 結構

```json
{
  "Logging": { ... },
  "FileLogging": { ... },
  "Jwt": { ... },
  "ReverseProxy": { ... },
  "Redis": { ... },
  "AllowedHosts": "*"
}
```

---

## Logging – 內建日誌等級

```json
"Logging": {
  "LogLevel": {
    "Default": "Information",
    "Microsoft": "Warning"
  }
}
```

| Key | 說明 |
|-----|------|
| Default | 應用程式 log 等級（Information 以上） |
| Microsoft | Framework log 避免過度輸出，僅 Warning 以上 |

---

## FileLogging – 自訂檔案日誌（CoreLib）

```json
"FileLogging": {
  "Directory": "/app/logs",
  "FileName": "api-gateway",
  "FileSizeLimitBytes": 10485760,
  "RetainedFileCountLimit": 10
}
```

| Key | 說明 |
|------|------|
| Directory | log 寫入位置，支援相對路徑、自動建立資料夾 |
| FileName | log 檔名前綴 |
| FileSizeLimitBytes | 單檔上限（10MB） |
| RetainedFileCountLimit | 輪替後最多保留 10 檔 |

---

## Jwt – JWT 驗證設定

```json
"Jwt": {
  "Issuer": "1968-issuer",
  "Audience": "1968-audience",
  "Key": "f9bf78b9a18ce6d46a0cd2b0b86df9da"
}
```

| Key | 說明 |
|------|------|
| Issuer | JWT Token Issuer |
| Audience | JWT Audience |
| Key | HMAC SHA256 金鑰（請改為環境變數） |

* AWS 正式環境 Key 建議搬到 環境變數 / Secret Manager，不要放在 Git 裡。  

---

# ④ ReverseProxy – YARP Gateway 設定

包含兩個部分：
- Routes（URL 如何映射到後端服務）
- Clusters（後端服務清單）

---

## Routes – 路由轉發規則

### auth_route

```json
"auth_route": {
  "ClusterId": "auth_cluster",
  "Match": { "Path": "/auth/{**catch-all}" },
  "Transforms": [
    { "PathRemovePrefix": "/auth" },
    { "RequestHeader": "X-Forwarded-PathBase", "Set": "/auth" },
    { "RequestHeader": "X-Forwarded-Prefix", "Set": "/auth" },
    { "RequestHeader": "X-Forwarded-Host", "Set": "{httpRequestHeader:Host}" },
    { "RequestHeader": "X-Forwarded-Proto", "Set": "{scheme}" },
    { "RequestHeader": "X-Correlation-ID", "Set": "{X-Correlation-ID}" },
    { "RequestHeader": "traceparent", "Set": "{traceparent}" }
  ]
}
```

用途：
1. Match.Path: /auth/{**catch-all}
  - 所有 /auth/** 的請求都會進到這個 route

2. ClusterId: auth_cluster
  - 這條路最後會丟給 auth_cluster 的某個 destination

3. Transforms
  - PathRemovePrefix: /auth：
    - 對 auth-svc 來說，實際傳過去會去掉 /auth 前綴
    - 例如 /auth/api/login → 實際丟到服務的是 /api/login

4. X-Forwarded-*：
  - 把原本 Client 的 Host / Scheme / Prefix 傳給後端服務（方便產生正確 URL & Swagger）

5. X-Correlation-ID:
  - 把 Gateway 的 Correlation ID 往後傳，串起整條 chain

6. traceparent:
  - 給 OpenTelemetry / 分散式追蹤使用

---

## Clusters – 服務實際位置

```json
"Clusters": {
  "auth_cluster": {
    "Destinations": {
      "auth1": { "Address": "http://auth-svc:8080/" }
    }
  }
}
```

支援：

- 多目的地（負載平衡）
- Docker Compose / k8s Service 名稱

---

# ⑤ Redis – 全微服務共用 Redis 設定

```json
"Redis": {
  "Host": "220.133.144.73",
  "Port": 6379,
  "Password": "Qwer890@",
  "DefaultDatabase": 0,
  "SSL": false,
  "ClientName": "webapi-1110",
  "AbortOnConnectFail": false
}
```

由 `AddRedisCore()` 自動組成 `ConfigurationOptions`。

建議：

- Password 移到環境變數
- 若部署在 k8s，使用 Secret 管理

---

# ⑥ AllowedHosts

```json
"AllowedHosts": "*"
```

允許所有 Host Header，可依正式環境限制：

```
"AllowedHosts": "api.example.com;admin.example.com"
```
