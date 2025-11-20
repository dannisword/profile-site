這個 `Composable` 封裝了 BaseHandle 的狀態管理功能，並整合了 API 數據獲取、列表查詢、表單操作 以及 使用者客製化設定 (Custom Columns) 的業務邏輯，制定標準畫面。

---

## 1.元件描述
### 1.1 依賴套件
- **vue**: 3.x (Reactive, Ref)
- **lodash**: (cloneDeep)
- **pinia**: (透過 `useApp` 取得全域資料字典 `dc`)

### 1.2 BaseHandle 樣板控制器
`BaseHandle` Vue 3 Reactivity System 的類別（Class-based State Manager）。  
主要是實現 **後端驅動 UI (Server-Driven UI)** 的模式，負責將後端回傳的 JSON 配置檔，包含表格定義、表單結構、查詢條件等，解析並映射到前端的響應式狀態中，供 `<AgGridTable>`、`<ElFormCustom>` 或 `<SearchForm>` 等元件使用。

### 1.3 DocumentHandle 業務控制器

`DocumentHandle` 是一個 Vue 3 Composition API 函式 (Composable)。  
用於將 BaseHandle 實例化，並為其注入一個業務畫面所需的 完整生命週期 和 數據操作方法。它負責處理頁面配置的載入、列表數據的獲取、表單數據的準備、以及使用者對表格欄位配置的儲存與應用。

---

## 2.核心功能
* **自動映射 (Auto Mapping)**: 將複雜的 JSON 結構轉換為 Vue Reactive State。
* **狀態隔離**: 使用 `lodash.cloneDeep` 確保原始配置 (`origin`) 與操作狀態 (`sections`) 分離。
* **模組化管理**: 集中管理 Table、Form、Search、Pagination 四大區塊的狀態。
* **動態表單支援**: 提供 `renderForm` 方法，支援在同一頁面動態切換不同的表單結構（如：查詢或是文件）。

### 2.1 架構  
DocumentHandle 充當 View 層 (Vue Component) 與 BaseHandle 狀態層之間的橋樑。  

| 組件 | 職責 |
|-----|------|
| BaseHandle (Instance) | 集中管理響應式狀態 (table, form, search, pagination)。|
| DocumentHandle (Composable) | 業務流程控制：載入配置、資料 CRUD、處理分頁、處理下拉選單選項、處理自訂欄位。|
 | View (e.g., <BaseRecords>) | 僅調用 DocumentHandle 提供的函式（如 read, setData）來驅動數據變化。|


### 2.2 方法 (API Methods)
返回一個包含 BaseHandle 實例和所有業務操作方法的物件。  
- **狀態與初始化**

	| 方法/屬性 | 類型 | 說明 |
 	|-----|------|------|
	| instance | BaseHandle | BaseHandle 響應式實例，所有 UI 綁定的狀態都來自於此。|
  | loadDocument(document) | Promise<boolean> | 透過 API (getDocument) 依據 route.name 或指定名稱載入後端配置，並呼叫 instance.map() 進行映射。同時初始化 custom 屬性並載入使用者自訂欄位。|
	| loadJson() | Promise<any> | 開發/測試用。 直接從專案根目錄的 json/[route.name].json 檔案載入配置。|

- **列表查詢與數據讀取**

	| 方法 | 說明 |
	|-----|------|
	| read(pagination)| 查詢方法。<br>1. 將 instance.search.schemas 轉換為 instance.search.params。<br>2. 處理分頁參數 (pagination)。<br>3. 呼叫 httpOperations.get(instance.path.search)。<br>4. 更新 instance.pagination 和 instance.table.records。<br>5. 呼叫 reload() 確保下拉選單選項更新。|
	| reload() | 更新查詢條件中的下拉選單選項。 確保 search.schemas 中的 select/multiple-select 選項（無論是來自 Cache 或 DC）是最新的。同時處理預設日期區間。|
	| searchClear() | 將 instance.search.schemas 中的值還原為 instance.origin.search.schemas 中的預設值。特別處理日期區間的預設邏輯 (addDay)。 |
	| get(id) | 透過 ID 呼叫讀取單筆資料的 API (instance.apiUrl.value.read)。 |

- **表單數據操作**

	| 方法 | 說明 |
	|-----|------|
	| setData(data) | 編輯數據<br> 1. 呼叫 formChenge() 處理下拉選單選項。<br>2. 呼叫 get(data.id) 獲取最新 DTO。<br>3. 將 DTO 填入 instance.form.dto 並將 DTO 中的屬性值回填到 instance.form.schemas (透過 objectToArray)。|
	| cleanData() | 清除數據。<br> 1. 呼叫 formChenge() 處理下拉選單選項。<br> 2. 將 instance.form.dto 重設為 instance.origin.form.dto 的深拷貝。|
	| create(data) | 呼叫 httpOperations.post(instance.path.create) 執行新增。 |
	| update(data) | 呼叫 httpOperations.put(instance.path.modify) 執行修改。|

- **客製化欄位設定 (Custom Columns)**

	| 方法 | 說明 |
	|-----|------|
	|  resetColumns(columns: any) | 儲存使用者客製化欄位。 當 Ag-Grid 欄位配置發生變化（如拖曳、排序、隱藏）時調用。 <br>1. 將當前欄位配置 JSON 化，存入 instance.custom.sectionContent。<br>2. 呼叫 setCustomColumns 將設定儲存至後端。<br>3. 更新 Pinia 中的快取 (useApp().resetCustoms)。|
	| setCustom(custom: any) | 套用自訂欄位。<br> 在 loadDocument 期間被調用。從 Pinia 快取中尋找使用者儲存的欄位設定，如果存在，則解析 JSON 並覆蓋 instance.table.columns。|

---

## 3. 開發方式

在 Vue SFC (`<script setup>`) 中實例化並使用：

```typescript
<script setup lang="ts">
import { DocumentHandle } from "../../hooks/v1/document-handle";

onBeforeMount(async () => {
  await loadDocument();
  await read();
});

</script>

<template>
	<!-- 搜尋條件-->
    <SearchForm
		:schemas="instance.search.schemas"
        :advanced="instance.search.advanced"
        @confirm="read()"
        @clear="searchClear()"
      >
	</SearchForm>

	<AgGridTable
    	:columns="handle.table.columns"
   		:records="handle.table.records"
    	:actions="handle.table.actions"
    	:pagination="handle.pagination"
  	/>

	<ElDialogCustom
        :title="instance.form.title"
        :width="'60%'"
        :visible="instance.form.visible"
        @on-before-close="onModalClose"
      >
        <ElFormCustom
          ref="formRef"
          :colNum="instance.form.column"
          :model="instance.form.dto"
          :schemas="instance.form.schemas"
          @on-form-btn-click="onFormBtnClick"
        />
	</ElDialogCustom>
</template>
```

## 4.JSON 配置說明
### 4.1 JSON基本資訊
- **基本屬性說明**
| 屬性 | 說明 |
|-----|------|
|id|系統模組編號|
|code|模組代碼|
|name|功能顯示名稱|
|component|使用的通用基礎元件|
|isEnable|模組啟用狀態|
### 4.2 API 介面定義 (Path)
- **此功能用於資料的 查詢、新增 和 修改，對應的後端 API 路徑如下**
| HTTP Method | 說明 |
|-----|------|
|Search 查詢|用於列表資料查詢和分頁|
|Create 新增|用於新增一筆資料|
|Modify 修改|用於修改已存在的資料|
### 4.3 列表查詢區塊 (Search)
- **查詢參數 (search.params)**
  列表查詢預設攜帶的參數，用於分頁和排序：
| 參數(prop) | 型別 | 說明 |
|-----|------|------|
|code|依定義型別|後端自定義查詢條件|
|page|number|查詢頁碼|
|size|number|每頁資料筆數|
|properties|string|排序欄位|
|direction|string|排序方向 ASC、DESC|
- **查詢欄位定義 (search.schemas)**  
提供給使用者的查詢介面欄位：
| 屬性(prop) | 值 | 說明 |
|-----|------|------|
|prop|code|文本輸入框，用於查詢|
|type|text|輸入框類型，text、select、multiple-select|
|label|溫別代碼|輸入框提示|
|value|||
|optionType|ENABLED_TYPE|多選下拉選單，選項來自 ENABLED_TYPE 字典|
|options|Array||

### 4.4 資料列表顯示 (Table)
- **列表全域動作 (table.actions)**
| 屬性(prop) | 值 | 說明 |
|-----|------|------|
|label|新增|按鈕文字顯示|
|type|success|按鈕顏色|
|field|Add|按鈕 icon|
|action|Add|按鈕事件|
- **列表欄位定義 (table.columns)**
表格顯示的欄位及其配置：
| 屬性(prop) | 值 | 說明 |
|-----|------|------|
|field|code|欄位名稱|
|headerName|name|表頭名稱|
|minWidth|120|欄位最小寬度|
|editable|FALSE|編輯模式|
|sortable|TRUE|排序資料|
|filter|FALSE|過濾資料|
|suppressMovable|FALSE|支援欄位移動|
|lockPosition|TRUE|固定位置|
|cellRenderer|AGActionButtonRenderer|動作按鈕|
- **動作按鈕 (actionButtons)**
觸發彈窗或頁面跳轉，用於修改該行資料
| 屬性(prop) | 值 | 說明 |
|-----|------|------|
|label|新增|按鈕文字顯示|
|icon|Edit|按鈕圖示|
|type|primary|按鈕顏色|
## 5 表單區塊 (Form)：表單用於資料的 新增 和 修改 操作。
- **資料傳輸物件 (form.dto)**
此物件定義了前後端傳輸資料的結構，包含了所有的欄位：
- **表單輸入欄位定義 (form.schemas)**
| 欄位 | 值 | 說明 |
|-----|------|------|
|prop|code|結構屬性|
|type|text|結構類別 text, number, select|
|label|溫別代碼|結構名稱|
|disabled|FALSE|唯讀|
|rules.required|TRUE|必填|
|rules.message|請輸入...|驗證顯示文字|
|rules.trigger|blur|事件觸發方式 'blur' or ‘change'|
- **表單上部動作 (Menus)**
表單提供了提交/取消等操作按鈕：
| 欄位 | 值 | 說明 |
|-----|------|------|
|label|新增|按鈕名稱|
|icon|Plus|按鈕圖示|
|type|success|按鈕顏色|
|event|Add|事件名稱|