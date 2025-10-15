
---

### **技术设计文档 (TDD): A4 Recite**

---

#### **1. 总体架构设计 (High-Level Architecture)**

1.1. **技术栈确认 (Technology Stack)**

*   **前端 (Frontend):** Next.js 15 + React 19 + TypeScript, Tailwind CSS + Shadcn/ui, React Hooks + Context API / Zustand (for state management), Axios / Fetch API (for HTTP requests).
*   **后端 (Backend):** Next.js API Routes, Node.js 18+, Prisma / Sequelize (ORM), TypeScript (for data validation).
*   **爬虫库:** Axios + Cheerio for HTML parsing.
*   **数据库 (Database):** MySQL 8.0+.
*   **Web 服务器 (Web Server):** Next.js built-in server / Node.js.
*   **部署:** Vercel / 自托管 Node.js 服务器.

1.2. **架构风格 (Architectural Style)**

*   **选择:** **单体应用 (Monolithic Architecture)**
*   **理由:**
    1.  **项目范围明确:** 本项目是为单一用户定制的工具，业务领域高度内聚，核心功能（词书管理、学习、复习）紧密耦合。
    2.  **开发与部署效率:** 单体架构下，开发、测试和部署流程极为简化，无需处理分布式系统的复杂性（如服务发现、API 网关、分布式事务），非常适合 V1.0 的快速交付目标。
    3.  **运维成本低:** 维护单个代码库和单个服务实例的成本远低于微服务集群，符合个人项目的定位。
    4.  **无扩展性压力:** 作为个人工具，不存在高并发或大规模用户增长的需求，单体应用的性能完全足够。

1.3. **数据流图 (Text-Based Data Flow)**

*   **核心流程 1: 首次访问与令牌创建/验证**
    `用户输入令牌 'yunyv-gre' -> 前端 POST /api/token/validate {token: 'yunyv-gre'} -> Next.js API Route -> 查询 Users 表是否存在该 token -> [不存在] 创建新 User 记录 -> 返回 {is_new: true} -> [已存在] -> 返回 {is_new: false} -> 前端将 token 存入 localStorage 并加载用户数据`

*   **核心流程 2: 词典数据获取**
    `用户查询单词 'example' -> 前端 GET /api/dictionary?word=example&type=all -> Next.js API Route -> 查询 Words 表是否存在该单词 -> [不存在] 使用 Cheerio 爬取 Bing 词典 -> 存入 Words 表 -> 返回完整释义数据 -> [已存在] 直接返回缓存数据 -> 前端显示释义`

*   **核心流程 3: 上传新词书**
    `用户选择 .txt 文件并命名 'GRE 核心' -> 前端 POST /api/wordlists (multipart/form-data) [文件, name='GRE 核心'] -> Next.js API Route -> 逐行读取文件内容 -> 对每个单词 text: [查询 Words 表 -> 若不存在, 创建新 Word 记录] -> 创建 Wordlist 记录 -> 创建 WordlistEntries 关联记录 -> 返回成功 -> 前端刷新词书列表`

*   **核心流程 4: 智能复习**
    `用户点击 '智能复习' -> 前端 GET /api/review/due -> Next.js API Route -> 查询 UserWordProgress 表 WHERE user_id = current_user AND next_review_date <= TODAY() -> 返回单词列表 JSON -> 前端进入专注学习模式, 载入单词队列 -> 用户按空格键完成一个单词 -> 前端 POST /api/review/progress/{word_id} -> Next.js API Route -> 更新该单词的 UserWordProgress (stage+1, next_review_date 更新) -> 返回成功`

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
*   所有 API 均以 `/api` 为前缀。
*   认证: 所有需要用户身份的接口，都需要在 HTTP Header 中提供 `Authorization: Bearer <user_token>`。后端将通过此 token 查询对应的 `user_id`。
*   响应格式: 统一使用 JSON 格式，包含 `success` 字段表示操作是否成功。

---

**Endpoint:** `POST /api/token/validate`
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
      "success": true,
      "message": "Token is valid.",
      "is_new": false
    }
    ```
*   **`400 Bad Request`:** 请求体格式错误。
    ```json
    {
      "success": false,
      "error": "Token field is required."
    }
    ```

---

**Endpoint:** `GET /api/dictionary`
**描述:** 获取单个单词的详细释义。**内部逻辑:** 1. 查 `Words` 表缓存。2. 若命中，直接返回 `definition_data` 字段。3. 若未命中，使用 Cheerio 爬虫任务实时抓取 Bing 词典。4. 抓取成功后，将数据存入 `Words` 表，然后返回给前端。5. 抓取失败，返回错误。
**认证:** 必需 (Bearer Token)

**请求 (Request):**
*   **查询参数 (Query Parameters):**
    *   `word`: `string` - 需要查询的单词。
    *   `type`: `string` - (可选) 释义类型，可选值: 'all', 'authoritative', 'bilingual', 'english'，默认为 'all'。
    *   `test`: `boolean` - (可选) 测试模式，设置为 'true' 时分析网站结构而非提取单词数据。

**响应 (Responses):**
*   **`200 OK`:** 返回完整的单词释义 JSON 对象。
    ```json
    {
      "success": true,
      "word": "example",
      "requestedType": "all",
      "data": {
        "pronunciation": "发音信息",
        "pronunciationData": {
          "american": {
            "phonetic": "[ɪɡˈzæmpəl]",
            "audioUrl": "音频URL"
          },
          "british": {
            "phonetic": "[ɪɡˈzɑːmpəl]",
            "audioUrl": "音频URL"
          }
        },
        "definitions": {
          "basic": [
            {
              "partOfSpeech": "n.",
              "meaning": "例子，范例"
            }
          ],
          "web": [
            {
              "meaning": "网络释义"
            }
          ]
        },
        "authoritativeDefinitions": [],
        "bilingualDefinitions": [],
        "englishDefinitions": [],
        "sentences": []
      }
    }
    ```
*   **`404 Not Found`:** 在 Bing 词典中找不到该单词。
    ```json
    {
      "success": false,
      "error": "Word not found",
      "message": "The word 'example' could not be found in the dictionary."
    }
    ```
*   **`500 Internal Server Error`:** 后端爬虫抓取数据失败（网络问题、反爬等）。
    ```json
    {
      "success": false,
      "error": "Failed to fetch word data",
      "message": "An unexpected error occurred while fetching data from the dictionary source."
    }
    ```

---

**Endpoint:** `POST /api/wordlists`
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
      "success": true,
      "id": 123,
      "name": "GRE 核心 3000",
      "word_count": 3000
    }
    ```
*   **`400 Bad Request`:** 文件为空或 `name` 字段缺失。
    ```json
    {
      "success": false,
      "error": "File is empty or name field is missing."
    }
    ```

---

**Endpoint:** `GET /api/wordlists`
**描述:** 获取当前用户的所有词书列表。
**认证:** 必需 (Bearer Token)

**响应 (Responses):**
*   **`200 OK`:**
    ```json
    {
      "success": true,
      "wordlists": [
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
    }
    ```

---

**Endpoint:** `DELETE /api/wordlists/{wordlist_id}`
**描述:** 删除指定的词书及其所有关联的学习进度。
**认证:** 必需 (Bearer Token)

**请求 (Request):**
*   **路径参数 (Path Parameters):**
    *   `wordlist_id`: `integer` - 要删除的词书 ID。

**响应 (Responses):**
*   **`200 OK`:** 删除成功。
    ```json
    {
      "success": true,
      "message": "Wordlist deleted successfully."
    }
    ```
*   **`404 Not Found`:** 词书不存在或不属于当前用户。
    ```json
    {
      "success": false,
      "error": "Wordlist not found."
    }
    ```

---

**Endpoint:** `GET /api/review/due`
**描述:** 获取当前用户所有今日及之前到期的待复习单词。
**认证:** 必需 (Bearer Token)

**响应 (Responses):**
*   **`200 OK`:** 返回待复习的单词列表。
    ```json
    {
      "success": true,
      "words": ["abandon", "prosaic", "ubiquitous", "..."],
      "count": 25
    }
    ```

---

**Endpoint:** `POST /api/review/progress/{word_id}`
**描述:** 标记一个单词已完成本次复习。后端将根据艾宾浩斯逻辑更新其复习阶段和下一次复习日期。
**认证:** 必需 (Bearer Token)

**请求 (Request):**
*   **路径参数 (Path Parameters):**
    *   `word_id`: `integer` - 已完成复习的单词 ID。

**响应 (Responses):**
*   **`200 OK`:**
    ```json
    {
      "success": true,
      "word_id": 42,
      "new_review_stage": 3,
      "next_review_date": "2025-10-10"
    }
    ```
*   **`404 Not Found`:** 该单词的学习进度记录不存在。
    ```json
    {
      "success": false,
      "error": "Progress record not found for this word."
    }
    ```





#### **4. 前端架构设计 (Frontend Architecture)**

4.1. **组件层级结构 (Component Hierarchy)**

```
- app/layout.tsx (应用根布局，处理全局样式和主题)
  - app/page.tsx (主页，用户进入后的仪表盘)
    - components/BentoGrid.tsx (Bento 网格布局容器)
      - components/WordlistsCard.tsx (我的词书卡片)
        - components/UploadWordlistModal.tsx (上传词书弹窗)
        - components/WordlistItem.tsx (可复用组件，展示单个词书)
      - components/ReviewCenterCard.tsx (复习中心卡片)
    - app/learning/page.tsx (专注学习模式页)
      - components/WordDisplay.tsx (负责在屏幕随机位置显示单个单词)
      - components/WordDefinitionPanel.tsx (单词释义浮动面板，默认隐藏)
      - components/ControlBar.tsx (固定在角落的控制条)
        - components/ShuffleButton.tsx
        - components/SettingsButton.tsx
      - components/SettingsPanel.tsx (从控制条弹出的设置面板)
    - app/test/page.tsx (全览测试模式页)
      - components/WordGrid.tsx (负责渲染所有单词卡片的网格)
        - components/WordCard.tsx (单个单词卡片，可翻转)
    - app/token/page.tsx (令牌输入/验证页)
      - components/TokenInputForm.tsx
```

4.2. **核心组件接口定义 (Core Component Props & Interfaces)**

```typescript
// components/WordlistItem.tsx
interface WordlistItemProps {
  wordlist: {
    id: number;
    name: string;
    wordCount: number;
  };
  onStartLearning: (wordlistId: number) => void;
  onStartTest: (wordlistId: number) => void;
  onDelete: (wordlistId: number) => void;
}

// components/WordCard.tsx
interface WordCardProps {
  wordText: string;
  wordDefinition: any | null;
  isFlipped?: boolean;
  onFlip?: () => void;
}

// components/SettingsPanel.tsx
interface SettingsPanelProps {
  isOpen: boolean;
  config: {
    fontSize: number;
    panelWidth: number;
    autoPlayAudio: boolean;
    loopAudio: boolean;
    instantConsolidation: boolean;
  };
  onConfigChange: (newConfig: SettingsState) => void;
  onClose: () => void;
  isLearningMode?: boolean;
}
```

4.3. **状态管理 (State Management - React Hooks + Context API)**

定义全局状态存储的结构，使用 React Context API 和自定义 Hooks。

```typescript
// types/user.ts
export interface UserState {
  token: string | null; // e.g., "yunyv-gre-mastery-2025"
  isAuthenticated: boolean; // 根据 token 是否有效设置
  status: 'idle' | 'loading' | 'authenticated' | 'error';
}

// types/wordlist.ts
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

// types/learning.ts
export interface Word {
  id: number;
  word_text: string;
  definition_data: any | null;
}
export interface LearningState {
  sessionType: 'new' | 'review' | 'test' | null;
  wordQueue: string[]; // 存储待学习/复习的单词文本队列
  currentWordText: string | null; // 当前显示的单词文本
  currentWordData: Word | null; // 当前单词的完整数据（含释义）
  status: 'idle' | 'active' | 'finished';
}

// types/settings.ts
export interface SettingsState {
  fontSize: number; // e.g., 24 (px)
  panelWidth: number; // e.g., 400 (px)
  autoPlayAudio: boolean;
  loopAudio: boolean;
  instantConsolidation: boolean;
}

// hooks/useUser.ts
export const useUser = () => {
  // 用户状态管理逻辑
};

// hooks/useWordlist.ts
export const useWordlist = () => {
  // 词书状态管理逻辑
};

// hooks/useLearning.ts
export const useLearning = () => {
  // 学习状态管理逻辑
};

// hooks/useSettings.ts
export const useSettings = () => {
  // 设置状态管理逻辑
};
```

4.4. **前端目录结构 (Directory Structure)**

```
/src
  /app              # Next.js App Router
    /api             # API 路由
      /dictionary    # 词典 API
      /token         # 令牌验证 API
      /wordlists     # 词书管理 API
      /review        # 复习进度 API
    /learning        # 学习模式页面
    /test            # 测试模式页面
    /token           # 令牌验证页面
    layout.tsx       # 根布局
    page.tsx         # 主页
  /components       # React 组件
    /ui             # 基础 UI 组件 (shadcn/ui)
    /wordlist       # 词书相关组件
    /learning       # 学习/测试模式相关组件
  /lib              # 工具库
    /utils.ts       # 通用工具函数
    /dictionary.ts   # 词典相关功能
    /api.ts         # API 客户端封装
  /types            # TypeScript 类型定义
    /index.ts       # 导出所有类型
  /hooks            # 自定义 React Hooks
    - useDictionary.ts
    - useWordlist.ts
    - useSettings.ts
    - useUser.ts
  /styles           # 样式文件
    - globals.css
  /public           # 静态资源
```

---
#### **5. 核心业务逻辑流程 (Core Business Logic Flow)**

以伪代码形式详细描述后端最关键的算法和流程。

*   **5.1. 词典数据获取逻辑 (后端)**
    *   **触发:** `GET /api/dictionary?word=example&type=all`
    *   **逻辑:**
        ```javascript
        async function getWordDefinition(word, type = 'all') {
          // 1. 检查数据库缓存
          const cachedWord = await db.query(
            'SELECT * FROM Words WHERE word_text = ?',
            [word]
          );
          
          if (cachedWord.length > 0) {
            // 2. 缓存命中，直接返回
            return {
              success: true,
              word: word,
              data: JSON.parse(cachedWord[0].definition_data)
            };
          }
          
          // 3. 缓存未命中，使用爬虫获取数据
          try {
            const scrapedData = await dictionaryScraper.scrapeWord(word, type);
            
            if (scrapedData.success) {
              // 4. 存入数据库缓存
              await db.query(
                'INSERT INTO Words (word_text, definition_data) VALUES (?, ?)',
                [word, JSON.stringify(scrapedData.data)]
              );
              
              return scrapedData;
            } else {
              return scrapedData;
            }
          } catch (error) {
            // 5. 爬取失败处理
            return {
              success: false,
              word: word,
              error: 'Failed to fetch word data'
            };
          }
        }
        ```

*   **5.2. "智能复习" 单词获取逻辑 (后端)**
    *   **触发:** `GET /api/review/due`
    *   **逻辑:**
        ```javascript
        async function getReviewWords(userId) {
          // 1. 获取当前服务器日期
          const currentDate = new Date().toISOString().split('T')[0];
          
          // 2. 查询数据库
          const progressRecords = await db.query(`
            SELECT w.word_text
            FROM UserWordProgress uwp
            JOIN Words w ON uwp.word_id = w.id
            WHERE uwp.user_id = ? AND uwp.next_review_date <= ?
          `, [userId, currentDate]);
          
          // 3. 提取单词文本列表
          const wordList = progressRecords.map(record => record.word_text);
          
          // 4. 返回结果
          return {
            success: true,
            words: wordList,
            count: wordList.length
          };
        }
        ```

*   **5.3. 单词完成复习逻辑 (后端)**
    *   **触发:** `POST /api/review/progress/{word_id}`
    *   **逻辑:**
        ```javascript
        async function markWordAsReviewed(userId, wordId) {
          // 1. 定义艾宾浩斯复习间隔 (以天为单位)
          const EBBINGHAUS_INTERVAL_MAP = {
            1: 1,  // stage 0 -> 1, 间隔 1 天
            2: 2,  // stage 1 -> 2, 间隔 2 天
            3: 4,  // stage 2 -> 3, 间隔 4 天
            4: 7,  // stage 3 -> 4, 间隔 7 天
            5: 15, // stage 4 -> 5, 间隔 15 天
            6: 30,
            7: 60
          };
          const MAX_STAGE = Math.max(...Object.keys(EBBINGHAUS_INTERVAL_MAP).map(Number));
          
          // 2. 查找用户的单词进度记录
          const progress = await db.query(
            'SELECT * FROM UserWordProgress WHERE user_id = ? AND word_id = ?',
            [userId, wordId]
          );
          
          if (progress.length === 0) {
            throw new Error('Progress for this word not found for the user.');
          }
          
          // 3. 计算新的复习阶段和下一次复习日期
          const currentStage = progress[0].review_stage;
          const nextStage = currentStage + 1;
          
          // 4. 获取复习间隔
          const intervalDays = EBBINGHAUS_INTERVAL_MAP[nextStage] ||
                               EBBINGHAUS_INTERVAL_MAP[MAX_STAGE];
          
          // 5. 计算新的复习日期
          const newReviewDate = new Date();
          newReviewDate.setDate(newReviewDate.getDate() + intervalDays);
          
          // 6. 更新数据库记录
          await db.query(`
            UPDATE UserWordProgress
            SET review_stage = ?, next_review_date = ?, last_reviewed_at = NOW()
            WHERE user_id = ? AND word_id = ?
          `, [nextStage, newReviewDate.toISOString().split('T')[0], userId, wordId]);
          
          // 7. 返回成功响应
          return {
            success: true,
            word_id: wordId,
            new_review_stage: nextStage,
            next_review_date: newReviewDate.toISOString().split('T')[0]
          };
        }
        ```

*   **5.4. 词书上传与单词入库逻辑 (后端)**
    *   **触发:** `POST /api/wordlists`
    *   **逻辑:**
        ```javascript
        async function uploadWordlist(userId, fileContent, wordlistName) {
          // 1. 解析文件内容为单词列表
          const wordsFromFile = fileContent
            .split('\n')
            .map(line => line.trim().toLowerCase())
            .filter(line => line.length > 0);
          
          const uniqueWords = [...new Set(wordsFromFile)];
          
          // 2. 开始事务
          const connection = await db.getConnection();
          await connection.beginTransaction();
          
          try {
            // 3. 查找或创建单词记录
            const wordIds = [];
            for (const wordText of uniqueWords) {
              // 尝试查找
              const [existingWord] = await connection.query(
                'SELECT id FROM Words WHERE word_text = ?',
                [wordText]
              );
              
              if (existingWord.length === 0) {
                // 如果不存在，则创建
                const [newWord] = await connection.query(
                  'INSERT INTO Words (word_text, definition_data) VALUES (?, ?)',
                  [wordText, '{}']
                );
                wordIds.push(newWord.insertId);
              } else {
                wordIds.push(existingWord[0].id);
              }
            }
            
            // 4. 创建词书记录
            const [newWordlist] = await connection.query(
              'INSERT INTO Wordlists (user_id, name) VALUES (?, ?)',
              [userId, wordlistName]
            );
            
            // 5. 批量创建关联记录
            const entriesToCreate = wordIds.map(wordId => [
              newWordlist.insertId,
              wordId
            ]);
            
            await connection.query(
              'INSERT INTO WordlistEntries (wordlist_id, word_id) VALUES ?',
              [entriesToCreate]
            );
            
            // 6. 提交事务
            await connection.commit();
            
            // 7. 返回成功响应
            return {
              success: true,
              id: newWordlist.insertId,
              name: wordlistName,
              word_count: uniqueWords.length
            };
          } catch (error) {
            // 8. 错误处理，回滚事务
            await connection.rollback();
            throw error;
          } finally {
            connection.release();
          }
        }
        ```
