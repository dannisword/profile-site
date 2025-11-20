## 1. AgGridTable 元件
### 1.1 元件概述
元件主要封裝 Ag-Grid，提供彈性、可擴充的表格基礎，強化了資料格式化（包括日期時間和數字/貨幣/百分比）、伺服器端分頁控制、以及自定義動作按鈕的功能。

### 1.2 元件功能與特性
| 功能區塊 | 特性描述  |
|--------|--------|
| 資料顯示 | 支援標準 Ag-Grid 功能，如排序、過濾、欄位拖曳/隱藏等。|
| 自動格式化 | column.format 字串，套用 day.js 或 Intl API 進行日期、時間、數字、貨幣、百分比的格式化。|
| 日期處理 | 支援不同時區 (input, timeZone) 和解析模式 (dayjs) 的日期時間轉換。|
| 數字/貨幣 | 支援 Intl.NumberFormat 進行數字、貨幣 (currency:TWD) 和百分比 (percent:1) 格式化。|
| 資料連動 | 透過 props.records 的 isSelected 屬性，與外部資料與 Ag-Grid Row 選擇狀態的雙向同步。|
| 分頁處理 | 提供外部控制的伺服器端分頁介面 AgPagination，透過 pagination:change 和 refresh 事件與父元件連動。|
| 操作欄位 | 自訂 Cell Renderer：AGTagCell 和 AGActionButtonRenderer，用於顯示標籤或動作按鈕。|
| 欄位儲存 | 支援欄位拖曳結束後的配置儲存，觸發 columns:reset 事件。|
| 動作按鈕 | 支援在表格上方顯示一組全域動作按鈕，props.actions。|
### 1.3 Prop 屬性一覽
| 屬性 | 型別 | 說明 |
|-----|-----|-----|
| columns | Array<any> | 欄位定義陣列 (ColDef)，支援自定義的 format 和 cellRenderer 擴充屬性。|
| records | Array<any> | 表格資料陣列。每筆資料需包含 id 欄位供 getRowId 識別，以及 isSelected 欄位供選擇狀態同步。|
| options | GridOptions | 覆寫 Ag-Grid 的標準 GridOptions。|
| actions | Array<any> | 表格上方的功能動作按鈕定義。|
| pagination | Object | 伺服器端分頁資訊 (number, size, totalElements, totalPages)。|
### 1.4 Event 事件一覽 (Output)
| Event 名稱 | 參數 | 說明 |
|-----|-----|-----|
| update:records|Array<any>|當行選擇狀態改變時發出，更新 records 陣列中的 isSelected 狀態，實現雙向綁定。|
| selectionChanged | Array<any> | Ag-Grid 選擇行變化時發出，返回選中的資料物件陣列。|
| grid-action-click | { action: any, data: any }| 點擊 AGActionButtonRenderer 中的行級動作按鈕時發出。 |
| action-click | any | 點擊功能動作按鈕時發出。 |
| pagination:change | { page:number, pageSize:number } | 點擊分頁器頁碼或改變每頁大小時發出，通知父元件加載新頁資料。|
| columns:reset | Array<any> | 當拖曳表頭改變欄位順序/大小時發出，返回最新的欄位定義配置，用於儲存配置。 |
### 1.5 格式化規範 (column.format) 
- **日期時間格式 Day.js 版本**
| 格式範例 | 說明  |
|--------|--------|
| dayjs:YYYY-MM-DD | 使用 Day.js 格式字串，以瀏覽器本地時間解析。|
| dayjs:YYYY-MM-DD | 搭配 timeZone: ‘Asia/Taipei',亦可將時區設定在 column 層級。|
| dayjs.tz:YYYY-MM-DD HH:mm:ss|Asia/Taipe | 使用 Day.js-Tz 轉換時區。|
```
# 使用 dayjs 自訂格式
{ 
	headerName: “本地日期", 
	field: “createdAt", 
	format: “dayjs:YYYY/MM/DD", 
	input: “local" 
}

{
    headerName: “建立日期", 
	field: “createdAt", 
	format: “dayjs.tz:YYYY-MM-DD", 
    timeZone:  “Asia/Taipei",
	input: “utc" 
}
```
- **Intl.DateTimeFormat 格式**
| 格式範例 | 說明  |
|--------|--------|
| date:short | 日期短格式（e.g., 2025/09/10）。|
| datetime:long | 日期時間長格式（e.g., September 10, 2025 at 8:30:00 AM|
| time:medium | 時間中格式（e.g., 08:30:00 AM）|
```
{ 
    headerName: "建立日期", 
    field: "createdAt", 
    format: "date:short" 
},
{ 
    headerName: "建立時間", 
    field: "createdAt", 
    format: "datetime:long" 
},
```
- **數字/貨幣/百分比格式（Intl.NumberFormat）**
| 格式範例 | 說明  |
|--------|--------|
| number:0 | 數字，小數點位數 (maximumFractionDigits) 為 0。 |
| currency:TWD | 貨幣格式，預設兩位小數。 |
| percent:1 | 百分比格式，小數點位數為 1。 |
```
  { headerName: "金額", field: "amount", format: "currency:TWD" },
  { headerName: "完成率", field: "progress", format: "percent:1" }, // 0.873 => 87.3%
  { headerName: "數量", field: "qty", format: "number:0" },
```
- **自訂函式格式**
| 格式範例 | 說明  |
|--------|--------|
| format: (v) => \#${String(v).padStart(4, "0")} | 提供一個 (value, params) => string 的函式作為 valueFormatter。|
```
  {
    headerName: "客製格式",
    field: "raw",
    format: (v: any) => (v ? `#${String(v).padStart(4, "0")}` : ""),
  }
```
### 1.6 Ag-Grid 配置規則
**預設設定 (baseGridOptions):**
rowSelection: "single" 單選
pagination: false ，關閉內建分頁，使用外部組件。

**預設欄位定義 (defaultColDef):**
sortable: true, filter: true, resizable: true, flex: 1, minWidth: 100。

**多國語言:** 透過 localeText 綁定 AG_GRID_LOCALE_TW 進行繁體中文在地化。

**欄位類型推導:**
若 column.format 為日期時間類型 (date, datetime, time 或 dayjs 相關)，且未指定過濾器，則自動套用 agDateColumnFilter。

--- 

## 2.