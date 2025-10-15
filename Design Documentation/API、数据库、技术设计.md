
---

### **技术设计文档 (TDD): A4 Recite**

---

#### **1. 总体架构设计 (High-Level Architecture)**

1.1. **技术栈确认 (Technology Stack)**

*   **前端 (Frontend):** Vue 3 (Composition API), TypeScript, Tailwind CSS, Pinia (for state management), Axios (for HTTP requests).
*   **后端 (Backend):** Python 3.11+, FastAPI, SQLAlchemy (ORM), Pydantic (for data validation).
*   **数据库 (Database):** MySQL 8.0+.
*   **Web 服务器 (Web Server):** Uvicorn.

1.2. **架构风格 (Architectural Style)**

*   **选择:** **单体应用 (Monolithic Architecture)**
*   **理由:**
    1.  **项目范围明确:** 本项目是为单一用户定制的工具，业务领域高度内聚，核心功能（词书管理、学习、复习）紧密耦合。
    2.  **开发与部署效率:** 单体架构下，开发、测试和部署流程极为简化，无需处理分布式系统的复杂性（如服务发现、API 网关、分布式事务），非常适合 V1.0 的快速交付目标。
    3.  **运维成本低:** 维护单个代码库和单个服务实例的成本远低于微服务集群，符合个人项目的定位。
    4.  **无扩展性压力:** 作为个人工具，不存在高并发或大规模用户增长的需求，单体应用的性能完全足够。

1.3. **数据流图 (Text-Based Data Flow)**

*   **核心流程 1: 首次访问与令牌创建/验证**
    `用户输入令牌 'yunyv-gre' -> 前端 POST /api/v1/token/validate {token: 'yunyv-gre'} -> 后端 API -> 查询 Users 表是否存在该 token -> [不存在] 创建新 User 记录 -> 返回 {is_new: true} -> [已存在] -> 返回 {is_new: false} -> 前端将 token 存入 localStorage 并加载用户数据`

*   **核心流程 2: 上传新词书**
    `用户选择 .txt 文件并命名 'GRE 核心' -> 前端 POST /api/v1/wordlists (multipart/form-data) [文件, name='GRE 核心'] -> 后端 API -> 逐行读取文件内容 -> 对每个单词 text: [查询 Words 表 -> 若不存在, 创建新 Word 记录] -> 创建 Wordlist 记录 -> 创建 WordlistEntries 关联记录 -> 返回成功 -> 前端刷新词书列表`

*   **核心流程 3: 智能复习**
    `用户点击 '智能复习' -> 前端 GET /api/v1/review/due -> 后端 API -> 查询 UserWordProgress 表 WHERE user_id = current_user AND next_review_date <= TODAY() -> 返回单词列表 JSON -> 前端进入专注学习模式, 载入单词队列 -> 用户按空格键完成一个单词 -> 前端 POST /api/v1/review/progress/{word_id} -> 后端 API -> 更新该单词的 UserWordProgress (stage+1, next_review_date 更新) -> 返回成功`

---

#### **2. 数据库设计 (Database Schema)**

数据库：
用户名 root
密码 123456

**表名:** `Users`
**描述:** 存储用户的核心标识。尽管是无账户系统，但需要一个实体来关联所有数据。

| 列名 (Column Name) | 数据类型 (Data Type) | 约束 (Constraints) | 描述/理由 (Description/Justification) |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | `PK, AUTO_INCREMENT` | 唯一的数字标识符。 |
| `token` | `VARCHAR(64)` | `NOT NULL, UNIQUE` | 用户自定义的同步令牌。`VARCHAR(64)` 提供了足够的长度和灵活性，`UNIQUE` 约束保证了全局唯一性。 |
| `created_at` | `TIMESTAMP` | `NOT NULL, DEFAULT CURRENT_TIMESTAMP` | 记录创建时间。 |
| `updated_at` | `TIMESTAMP` | `NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | 记录更新时间。 |

**表名:** `Wordlists`
**描述:** 存储用户上传的词书信息。

| 列名 (Column Name) | 数据类型 (Data Type) | 约束 (Constraints) | 描述/理由 (Description/Justification) |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | `PK, AUTO_INCREMENT` | 唯一的数字标识符。 |
| `user_id` | `BIGINT` | `NOT NULL, FK -> Users(id)` | 关联到 `Users` 表，表明该词书的拥有者。 |
| `name` | `VARCHAR(100)` | `NOT NULL` | 用户为词书定义的名称，例如 "GRE 核心 3000"。 |
| `created_at` | `TIMESTAMP` | `NOT NULL, DEFAULT CURRENT_TIMESTAMP` | 记录创建时间。 |
| `updated_at` | `TIMESTAMP` | `NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | 记录更新时间。 |

**表名:** `Words`
**描述:** 全局单词缓存表。存储从 Bing 词典抓取的单词详细信息，避免重复抓取。

| 列名 (Column Name) | 数据类型 (Data Type) | 约束 (Constraints) | 描述/理由 (Description/Justification) |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | `PK, AUTO_INCREMENT` | 唯一的数字标识符。 |
| `word_text` | `VARCHAR(100)` | `NOT NULL, UNIQUE` | 单词的文本本身。`UNIQUE` 约束是此表作为缓存的关键。 |
| `definition_data` | `JSON` | `NOT NULL` | 存储从 Bing 词典抓取并清洗后的完整结构化数据。使用 `JSON` 类型能原生存储复杂对象，无需序列化，且便于未来扩展字段。 |
| `created_at` | `TIMESTAMP` | `NOT NULL, DEFAULT CURRENT_TIMESTAMP` | 记录首次抓取时间。 |
| `updated_at` | `TIMESTAMP` | `NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | 记录更新时间 (未来可用于缓存失效策略)。 |

**表名:** `WordlistEntries`
**描述:** `Wordlists` 和 `Words` 的多对多关联表。

| 列名 (Column Name) | 数据类型 (Data Type) | 约束 (Constraints) | 描述/理由 (Description/Justification) |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | `PK, AUTO_INCREMENT` | 唯一的数字标识符。 |
| `wordlist_id` | `BIGINT` | `NOT NULL, FK -> Wordlists(id)` | 关联到 `Wordlists` 表。 |
| `word_id` | `BIGINT` | `NOT NULL, FK -> Words(id)` | 关联到 `Words` 表。 |
| `(wordlist_id, word_id)` | - | `UNIQUE` | 复合唯一键，确保一个词书里同一个单词只出现一次。 |

**表名:** `UserWordProgress`
**描述:** **核心业务表**。跟踪每个用户对每个单词的学习进度，驱动艾宾浩斯复习。

| 列名 (Column Name) | 数据类型 (Data Type) | 约束 (Constraints) | 描述/理由 (Description/Justification) |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | `PK, AUTO_INCREMENT` | 唯一的数字标识符。 |
| `user_id` | `BIGINT` | `NOT NULL, FK -> Users(id)` | 关联用户。 |
| `word_id` | `BIGINT` | `NOT NULL, FK -> Words(id)` | 关联单词。 |
| `review_stage` | `INT` | `NOT NULL, DEFAULT 0` | 当前复习阶段 (0-N)。`0` 表示刚学完。 |
| `next_review_date`| `DATE` | `NOT NULL` | 下一次需要复习的日期。使用 `DATE` 类型，不关心具体时间，便于 `WHERE next_review_date <= TODAY()` 查询。 |
| `last_reviewed_at`| `TIMESTAMP` | `NULL` | 上一次复习的时间戳。首次学习后创建记录时为 `NULL`。 |
| `(user_id, word_id)` | - | `UNIQUE` | 复合唯一键，确保一个用户对一个单词只有一个进度记录。 |
| `created_at` | `TIMESTAMP` | `NOT NULL, DEFAULT CURRENT_TIMESTAMP` | 记录创建时间。 |
| `updated_at` | `TIMESTAMP` | `NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | 记录更新时间。 |


**关系定义 (Text-Based):**
*   `Users` (1) ---< `Wordlists` (N) : 一个用户可以拥有多个词书。
*   `Wordlists` (1) ---< `WordlistEntries` (N) : 一个词书包含多个单词条目。
*   `Words` (1) ---< `WordlistEntries` (N) : 一个单词可以出现在多个词书中。
*   `Users` (1) ---< `UserWordProgress` (N) : 一个用户有多个单词的学习进度。
*   `Words` (1) ---< `UserWordProgress` (N) : 一个单词被多个用户学习。

---

#### **3. 后端 API 规范 (Backend API Specification)**

**通用约定:**
*   所有 API 均以 `/api/v1` 为前缀。
*   认证: 所有需要用户身份的接口，都需要在 HTTP Header 中提供 `Authorization: Bearer <user_token>`。后端将通过此 token 查询对应的 `user_id`。

---

**Endpoint:** `POST /api/v1/token/validate`
**描述:** 创建或验证一个用户令牌。这是用户进入系统的唯一入口。
**认证:** 无 (此接口用于获取认证)

**请求 (Request):**
*   **请求体 (Request Body):** `application/json`
    ```json
    {
      "token": "string" // 用户输入的自定义令牌, e.g., "yunyv-gre-mastery-2025"
    }
    ```

**响应 (Responses):**
*   **`200 OK`:** 令牌有效或创建成功。
    ```json
    {
      "message": "Token is valid."
    }
    ```
*   **`400 Bad Request`:** 请求体格式错误。
    ```json
    {
      "detail": "Token field is required."
    }
    ```
*   **`422 Unprocessable Entity`:** FastAPI 自动验证错误。

---

**Endpoint:** `POST /api/v1/wordlists`
**描述:** 上传一个新的词书文件，并为其命名。
**认证:** 必需 (Bearer Token)

**请求 (Request):**
*   **请求体 (Request Body):** `multipart/form-data`
    *   `file`: The `.txt` or `.csv` file containing words.
    *   `name`: `string` - The user-defined name for the wordlist.

**响应 (Responses):**
*   **`201 Created`:** 词书创建成功。
    ```json
    {
      "id": 123,
      "name": "GRE 核心 3000",
      "word_count": 3000
    }
    ```
*   **`400 Bad Request`:** 文件为空或 `name` 字段缺失。

---

**Endpoint:** `GET /api/v1/wordlists`
**描述:** 获取当前用户的所有词书列表。
**认证:** 必需 (Bearer Token)

**响应 (Responses):**
*   **`200 OK`:**
    ```json
    [
      {
        "id": 123,
        "name": "GRE 核心 3000",
        "word_count": 3000,
        "created_at": "2025-09-29T10:00:00Z"
      },
      {
        "id": 124,
        "name": "经济学人高频词",
        "word_count": 500,
        "created_at": "2025-09-28T15:30:00Z"
      }
    ]
    ```

---

**Endpoint:** `DELETE /api/v1/wordlists/{wordlist_id}`
**描述:** 删除指定的词书及其所有关联的学习进度。
**认证:** 必需 (Bearer Token)

**请求 (Request):**
*   **路径参数 (Path Parameters):**
    *   `wordlist_id`: `integer` - 要删除的词书 ID。

**响应 (Responses):**
*   **`204 No Content`:** 删除成功。
*   **`404 Not Found`:** 词书不存在或不属于当前用户。

---

**Endpoint:** `GET /api/v1/wordlists/{wordlist_id}/words`
**描述:** 获取指定词书中的单词列表。支持根据学习状态进行过滤。
**认证:** 必需 (Bearer Token)

**请求 (Request):**
*   **路径参数 (Path Parameters):**
    *   `wordlist_id`: `integer` - 词书 ID。
*   **查询参数 (Query Parameters):**
    *   `status`: `string` - (可选) 过滤条件。`"unlearned"`: 只返回尚未在 `UserWordProgress` 中有记录的单词; `"all"` 或不提供: 返回所有单词。

**响应 (Responses):**
*   **`200 OK`:** 返回单词文本列表。
    ```json
    {
      "words": ["abandon", "abate", "abdicate", "..."]
    }
    ```
*   **`404 Not Found`:** 词书不存在。

---

**Endpoint:** `POST /api/v1/learning/session/complete`
**描述:** 在“专注学习模式”下完成对一个词书所有新词的第一遍学习后调用。为这批单词批量创建初始学习进度记录。
**认证:** 必需 (Bearer Token)

**请求 (Request):**
*   **请求体 (Request Body):** `application/json`
    ```json
    {
      "wordlist_id": 123 // 完成学习的词书ID
    }
    ```

**响应 (Responses):**
*   **`200 OK`:**
    ```json
    {
        "message": "Initial progress for 50 words in wordlist 123 has been created."
    }
    ```

---

**Endpoint:** `GET /api/v1/review/due`
**描述:** 获取当前用户所有今日及之前到期的待复习单词。
**认证:** 必需 (Bearer Token)

**响应 (Responses):**
*   **`200 OK`:** 返回待复习的单词列表。
    ```json
    {
      "words": ["abandon", "prosaic", "ubiquitous", "..."],
      "count": 25
    }
    ```

---

**Endpoint:** `POST /api/v1/review/progress/{word_id}`
**描述:** 标记一个单词已完成本次复习。后端将根据艾宾浩斯逻辑更新其复习阶段和下一次复习日期。
**认证:** 必需 (Bearer Token)

**请求 (Request):**
*   **路径参数 (Path Parameters):**
    *   `word_id`: `integer` - 已完成复习的单词 ID。

**响应 (Responses):**
*   **`200 OK`:**
    ```json
    {
      "word_id": 42,
      "new_review_stage": 3,
      "next_review_date": "2025-10-10"
    }
    ```
*   **`404 Not Found`:** 该单词的学习进度记录不存在。

---

**Endpoint:** `GET /api/v1/word/{word_text}`
**描述:** 获取单个单词的详细释义。**内部逻辑:** 1. 查 `Words` 表缓存。2. 若命中，直接返回 `definition_data` 字段。3. 若未命中，触发爬虫任务实时抓取 Bing 词典。4. 抓取成功后，将数据存入 `Words` 表，然后返回给前端。5. 抓取失败，返回错误。
**认证:** 必需 (Bearer Token)

**请求 (Request):**
*   **路径参数 (Path Parameters):**
    *   `word_text`: `string` - 需要查询的单词。

**响应 (Responses):**
*   **`200 OK`:** 返回完整的单词释义 JSON 对象。
    ```json
    {
      "word": "need",
      "pronunciation": { ... },
      "quick_definitions": [ ... ],
      // ... 结构完全遵循 PRD 中定义的 JSON 格式
    }
    ```
*   **`404 Not Found`:** 在 Bing 词典中找不到该单词。
*   **`503 Service Unavailable`:** 后端爬虫抓取数据失败（网络问题、反爬等）。





#### **4. 前端架构设计 (Frontend Architecture)**

4.1. **组件层级结构 (Component Hierarchy)**

```
- App.vue (应用根组件，处理全局样式和路由视图)
  - RouterView
    - TokenEntryPage.vue (令牌输入/验证页)
      - TokenInputForm.vue
    - HomePage.vue (主页，用户进入后的仪表盘)
      - BentoGridContainer.vue (Bento 网格布局容器)
        - MyWordlistsCard.vue (我的词书卡片)
          - UploadWordlistModal.vue (上传词书弹窗)
            - FileUploader.vue
          - WordlistItem.vue (可复用组件，展示单个词书)
            - ActionButton.vue (学习/测试按钮)
        - ReviewCenterCard.vue (复习中心卡片)
          - SmartReviewButton.vue (显示待复习数并启动复习)
    - LearningModePage.vue (专注学习模式页)
      - WordDisplay.vue (负责在屏幕随机位置显示单个单词)
      - WordDefinitionPanel.vue (单词释义浮动面板，默认隐藏)
      - ControlBar.vue (固定在角落的控制条)
        - ShuffleButton.vue
        - SettingsButton.vue
      - SettingsPanel.vue (从控制条弹出的设置面板)
        - FontSizeSlider.vue
        - PanelWidthSlider.vue
        - ToggleSwitch.vue (用于自动发音、循环发音、即时巩固等)
    - TestModePage.vue (全览测试模式页)
      - WordGrid.vue (负责渲染所有单词卡片的网格)
        - WordCard.vue (单个单词卡片，可翻转)
      - ControlBar.vue (复用自学习模式的控制条)
        - ShuffleButton.vue
        - SettingsButton.vue
      - SettingsPanel.vue (复用自学习模式的设置面板)
```

4.2. **核心组件接口定义 (Core Component Props & Emits)**

*   **`WordlistItem.vue`**
    *   **Props:**
        *   `wordlist: { id: number, name: string, wordCount: number }` - 必需。包含要显示的词书信息。
    *   **Emits:**
        *   `start-learning(wordlistId: number)`: 当用户点击“开始学习”时触发。
        *   `start-test(wordlistId: number)`: 当用户点击“全览测试”时触发。
        *   `delete(wordlistId: number)`: 当用户点击删除按钮时触发。

*   **`WordCard.vue`**
    *   **Props:**
        *   `wordText: string` - 必需。要显示的单词文本。
        *   `wordDefinition: Object | null` - 必需。单词的完整释义对象。初始加载时可以为 `null`。
    *   **State (Internal):**
        *   `isFlipped: boolean` - 默认 `false`。控制卡片是否翻转以显示释义。
        *   `isLoading: boolean` - 默认 `false`。控制是否显示释义加载状态。
    *   **Logic:**
        *   在 `onMounted` 或被点击时，如果 `wordDefinition` 为 `null`，则调用 API 获取释义并更新状态。
        *   点击事件切换 `isFlipped` 的值。

*   **`SettingsPanel.vue`**
    *   **Props:**
        *   `modelValue: boolean` - 控制面板的显示/隐藏 (for `v-model`)。
        *   `isLearningMode: boolean` - 必需。用于判断是否显示“即时巩固”等特定模式下的选项。
        *   `config: { fontSize: number, panelWidth: number, autoPlayAudio: boolean, loopAudio: boolean, instantConsolidation: boolean }` - 必需。当前的配置对象。
    *   **Emits:**
        *   `update:config(newConfig: Object)`: 当任何设置项发生变化时，发出带有完整新配置对象的事件，以便父组件更新。
        *   `close`: 当用户点击关闭按钮时触发。

4.3. **状态管理 (State Management - Pinia)**

定义全局状态存储的结构，分为不同的模块 (stores)。

```typescript
// store/user.ts
export interface UserState {
  token: string | null; // e.g., "yunyv-gre-mastery-2025"
  isAuthenticated: boolean; // 根据 token 是否有效设置
  status: 'idle' | 'loading' | 'authenticated' | 'error';
}

// store/wordlists.ts
export interface Wordlist {
  id: number;
  name: string;
  wordCount: number;
  createdAt: string;
}
export interface WordlistsState {
  items: Wordlist[];
  status: 'idle' | 'loading' | 'success' | 'error';
}

// store/learning.ts
export interface Word {
  id: number;
  word_text: string;
  definition_data: Object | null;
}
export interface LearningState {
  sessionType: 'new' | 'review' | 'test' | null;
  wordQueue: string[]; // 存储待学习/复习的单词文本队列
  currentWordText: string | null; // 当前显示的单词文本
  currentWordData: Word | null; // 当前单词的完整数据（含释义）
  status: 'idle' | 'active' | 'finished';
}

// store/settings.ts
export interface SettingsState {
  fontSize: number; // e.g., 24 (px)
  panelWidth: number; // e.g., 400 (px)
  autoPlayAudio: boolean;
  loopAudio: boolean;
  instantConsolidation: boolean;
}
```

4.4. **前端目录结构 (Directory Structure)**

```
/src
  /api              // API 服务层，封装 Axios 调用
    - auth.ts
    - wordlists.ts
    - words.ts
  /assets           // 静态资源 (CSS, images)
  /components       // 可复用 Vue 组件
    /common         // 通用组件 (buttons, sliders, toggles)
    /layout         // 布局组件 (BentoGridContainer.vue)
    /wordlist       // 词书相关组件 (MyWordlistsCard.vue, WordlistItem.vue)
    /learning       // 学习/测试模式相关组件 (WordDisplay.vue, WordCard.vue)
  /composables      // Vue Composition API 可复用逻辑
    - useWordDefinition.ts // 封装单词释义获取和缓存逻辑
  /router           // Vue Router 配置
    - index.ts
  /store            // Pinia 状态管理
    - index.ts
    - user.ts
    - wordlists.ts
    - learning.ts
    - settings.ts
  /types            // TypeScript 类型定义
    - index.ts      // 导出所有类型
  /views (or /pages)  // 页面级组件
    - HomePage.vue
    - TokenEntryPage.vue
    - LearningModePage.vue
    - TestModePage.vue
    - NotFoundPage.vue
  App.vue
  main.ts
```

---
#### **5. 核心业务逻辑流程 (Core Business Logic Flow)**

以伪代码形式详细描述后端最关键的算法和流程。

*   **5.1. "智能复习" 单词获取逻辑 (后端)**
    *   **触发:** `GET /api/v1/review/due`
    *   **逻辑:**
        ```pseudocode
        FUNCTION getReviewWords(user_id: integer):
          // 1. 获取当前服务器日期
          current_date = TODAY()

          // 2. 查询数据库
          // 查询 UserWordProgress 表中，属于当前用户，
          // 且 next_review_date 小于或等于今天的记录。
          // 同时，连接 Words 表以获取单词文本。
          progress_records = DB.query(
            SELECT
              Words.word_text
            FROM UserWordProgress
            JOIN Words ON UserWordProgress.word_id = Words.id
            WHERE
              UserWordProgress.user_id = :user_id AND
              UserWordProgress.next_review_date <= :current_date
          )

          // 3. 提取单词文本列表
          word_list = [record.word_text for record in progress_records]

          // 4. 返回结果
          RETURN {
            "words": word_list,
            "count": length(word_list)
          }
        ```

*   **5.2. 单词完成复习逻辑 (后端)**
    *   **触发:** `POST /api/v1/review/progress/{word_id}`
    *   **逻辑:**
        ```pseudocode
        FUNCTION markWordAsReviewed(user_id: integer, word_id: integer):
          // 1. 定义艾宾浩斯复习间隔 (以天为单位)
          // 键: 当前 stage (完成本次复习后即将进入的 stage)
          // 值: 距离下一次复习的天数
          EBBINGHAUS_INTERVAL_MAP = {
            1: 1,  // stage 0 -> 1, 间隔 1 天
            2: 2,  // stage 1 -> 2, 间隔 2 天
            3: 4,  // stage 2 -> 3, 间隔 4 天
            4: 7,  // stage 3 -> 4, 间隔 7 天
            5: 15, // stage 4 -> 5, 间隔 15 天
            6: 30,
            7: 60
            // ... 可继续扩展
          }
          MAX_STAGE = max(keys(EBBINGHAUS_INTERVAL_MAP))

          // 2. 查找用户的单词进度记录
          progress = DB.find_one(UserWordProgress, WHERE user_id = :user_id AND word_id = :word_id)
          IF progress IS NULL:
            RAISE NotFoundError("Progress for this word not found for the user.")

          // 3. 计算新的复习阶段和下一次复习日期
          current_stage = progress.review_stage
          next_stage = current_stage + 1

          // 4. 获取复习间隔
          // 如果超出预设的最大阶段，则使用最长的间隔
          interval_days = EBBINGHAUS_INTERVAL_MAP.get(next_stage, EBBINGHAUS_INTERVAL_MAP[MAX_STAGE])

          // 5. 计算新的复习日期
          new_review_date = TODAY() + interval_days

          // 6. 更新数据库记录
          DB.update(
            progress,
            SET
              review_stage = next_stage,
              next_review_date = new_review_date,
              last_reviewed_at = NOW()
          )
          DB.commit()

          // 7. 返回成功响应
          RETURN {
            "word_id": word_id,
            "new_review_stage": next_stage,
            "next_review_date": format_date(new_review_date)
          }
        ```

*   **5.3. 词书上传与单词入库逻辑 (后端)**
    *   **触发:** `POST /api/v1/wordlists`
    *   **逻辑:**
        ```pseudocode
        FUNCTION uploadWordlist(user_id: integer, file_content: string, wordlist_name: string):
          // 1. 解析文件内容为单词列表
          // 按行分割，去除首尾空格，过滤空行，转换为小写
          words_from_file = [line.strip().lower() for line in file_content.splitlines() if line.strip()]
          unique_words = unique(words_from_file)

          // 2. [事务开始]
          DB.begin_transaction()

          // 3. 查找或创建单词记录
          // 目标: 获取所有单词在 Words 表中的 ID
          word_ids = []
          for word_text in unique_words:
            // 尝试查找
            word_record = DB.find_one(Words, WHERE word_text = :word_text)
            IF word_record IS NULL:
              // 如果不存在，则创建。definition_data 此时可以为空或默认值，
              // 之后通过 JIT 方式填充。
              new_word = DB.create(Words, word_text=word_text, definition_data={})
              word_ids.append(new_word.id)
            ELSE:
              word_ids.append(word_record.id)

          // 4. 创建词书记录
          new_wordlist = DB.create(Wordlists, user_id=user_id, name=wordlist_name)

          // 5. 批量创建关联记录
          entries_to_create = []
          for word_id in word_ids:
            entries_to_create.append({wordlist_id: new_wordlist.id, word_id: word_id})
          DB.bulk_create(WordlistEntries, entries_to_create)

          // 6. [事务提交]
          DB.commit()

          // 7. 返回成功响应
          RETURN {
            "id": new_wordlist.id,
            "name": new_wordlist.name,
            "word_count": length(unique_words)
          }
        ```
