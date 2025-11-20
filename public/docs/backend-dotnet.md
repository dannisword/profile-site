![倉庫示意圖](./images/micro.png)

## 1. API Gateway 使用 .NET 9 + YARP Reverse Proxy 架構，並整合：
- CoreLib.Common 基底模組（Logging、JWT、Swagger、CorrelationId、Redis）
- Swagger Aggregator（聚合子系統的 Swagger UI）
- JWT Authentication
- 全域 Exception Middleware
- Correlation ID Trace
- Reverse Proxy（YARP）路由至後端微服務

### 1.1 多微服務架構的入口 API Gateway。
服務將會啟動：
- Gateway 的 Swagger UI
- 各微服務的聚合 Swagger
- YARP 反向代理

---

## 2. 建立 Builder 並套用 Core 預設設定
```
var builder = WebApplication.CreateBuilder(args).AddCoreDefaults();
```
AddCoreDefaults() 來自 CoreLib.Common，包含：
- 日誌（Console + JsonFile）
- JWT 驗證標準設定
- 基底 Swagger 設定（含 Bearer Schema）

## 3. 註冊服務（Dependency Injection）
```
builder.Services.AddControllers();
builder.Services.AddRedisCore(builder.Configuration, sectionName: "Redis");
builder.Services.AddAuthorization();
builder.Services.AddHttpClient();
builder.Services.AddReverseProxy().LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerWithJwt(...);
```

### 3.1 Controllers
提供標準 Web API controller 支援。

### 3.2 RedisCore
從 appsettings 的 Redis 區段讀取設定，註冊 ConnectionMultiplexer 及 Redis Services。

### 3.3 Authorization
啟用 [Authorize] 授權功能。

### 3.4 HttpClient
註冊可供微服務之間呼叫的 HttpClient。

### 3.5 YARP Reverse Proxy
讀取 appsettings ReverseProxy 區段，建立路由 + cluster 設定。

### 3.6 SwaggerWithJwt
建立 Swagger Doc 及 Bearer Authentication Schema。

## 4. 建立 WebApplication
```
var app = builder.Build();
```
## 5. Middleware Pipeline（執行流程）
```
app.UseCorrelationId();
app.UseForwardedHeaders();
app.UseRouting();
app.UseSwagger();
app.UseSwaggerUI(...);
app.UseMiddleware<GlobalExceptionMiddleware>();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapReverseProxy();
app.Run()
```
### 5.1 UseCorrelationId()
這是 CoreLib.Common 中的 Middleware：
- 自動生成或讀取 X-Correlation-ID
- 寫入 Response Header
- 寫入 Logging Scope（Console/檔案 log 全部支援）
- 用於分散式微服務的 Trace。

### 5.2 UseForwardedHeaders()
支援：
- X-Forwarded-For、X-Forwarded-Proto、X-Forwarded-Host

通常搭配：
- Nginx、k8s ingress、YARP Gateway 前置代理
使 Swagger/Redirect 等 URL 正確回推外部路徑。

### 5.3 UseRouting()
- 啟用 ASP.NET 路由機制。

### 5.4 UseSwagger() + Aggregated Swagger UI
```
app.UseSwagger();
app.UseSwaggerUI(ui =>
{
    ui.SwaggerEndpoint("/swagger/gateway-v1/swagger.json", "api-gateway");
    ui.SwaggerEndpoint("/auth/swagger/v1/swagger.json", "auth-svc");
    ui.SwaggerEndpoint("/user/swagger/v1/swagger.json", "user-svc");
});
```
這裡建立：
- Gateway 自己的 Swagger
- 聚合 Auth-Service 的 Swagger
- 聚合 User-Service 的 Swagger
開發能從 Gateway UI 一次看到所有服務的 API 文件。

### 5.5 全域 Exception Middleware
```
app.UseMiddleware<GlobalExceptionMiddleware>();
```
提供：
- 統一格式回應（code/message）
- 全域捕捉例外
- 日誌紀錄（含 Correlation ID）

### 5.6 Authentication / Authorization
依序：
- UseAuthentication() → 驗證 JWT Token
- UseAuthorization() → 套用 [Authorize] Policy

### 5.7 MapControllers
- 註冊 Gateway 的 API endpoints。

### 5.8 MapReverseProxy()
啟用 YARP，使 Gateway 用以下方式轉發：
```
/auth/**  → auth-svc
/user/**  → user-svc
```
路由配置來源為：
```
"ReverseProxy": {
    "Routes": { ... },
    "Clusters": { ... }
}
```