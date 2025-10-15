## **产品需求文档 (PRD): "A4 Recite"**

- **文档版本:** V1.1 (最终版)
- **创建日期:** 2025 年 9 月 28 日
- **作者/产品经理:** [Gemini]
- **项目负责人/唯一用户:** [yunyv]

---

### **1. 产品概述与愿景 (Product Overview & Vision)**

#### **1.1. 项目背景**

灵感源自 B 站 UP 主“晴儿 Patricia”分享的“A4 纸背单词法”。该方法通过在 A4 纸上随机抄写单词，强制学习者进行“主动回忆”，并通过高频次滚动复习来对抗遗忘。本项目旨在将该方法的核心思想进行数字化和产品化，打造一个极致纯粹、高效的个人单词记忆工具。

#### **1.2. 产品愿景**

为项目负责人 [yunyv] 打造一个**极致个人化、无妥协、无干扰**的学习环境。它并非一款面向市场的产品，而是一个为满足特定高效学习需求而定制的精密工具。它致力于根除“假性记忆”，将背单词过程中的主导权完全交还给使用者，使其成为使用者记忆能力的数字延伸。

#### **1.3. 目标用户**

**唯一用户:** 项目负责人 [yunyv]。

- **身份:** 目标驱动型学习者，可能正在备考特定考试。
- **核心诉求:**
  - 需要一个绝对专注、无任何社交或游戏化元素的学习工具。
  - 追求最高的学习效率，厌恶市面上功能臃肿的应用。
  - 强调“主动回忆”而非“被动识别”的学习方式。
  - 需要在 Windows PC 和 iPad 设备间无缝同步学习进度。

#### **1.4. 核心设计原则**

- **用户主权 (User Sovereignty):** 产品绝对信任使用者的主观判断。不提供“认识/忘记”等按钮，不通过算法猜测用户的记忆状态。产品只负责呈现问题（单词）和提供答案（释义）。
- **绝对专注 (Absolute Focus):** 界面极简，采用类纸质、护眼的 Bento 风格设计。无广告、无推送、无社交、无任何可能分散注意力的元素。
- **简捷直接 (Simplicity & Directness):** 摒弃传统的注册登录流程，采用创新的“令牌”机制实现数据同步。所有交互设计都以最少的步骤达成目标。
- **工具而非保姆 (Tool, Not a Nanny):** 产品定位是一个强大的辅助工具，它提供高效的框架和流程，但从不替用户做决定或强制其学习路径。

---

### **2. 功能详述 (Feature Specifications)**

#### **模块 1: 基于令牌的无账户数据同步系统 (Token-Based Accountless Data Sync)**

- **FR-1.1: 令牌创建与认证**
  - **描述:** 系统的核心身份识别机制。用户的**所有数据（词书、学习进度）都与一个用户自定义的、全局唯一的“令牌”强绑定**。
  - **用户流程:**
    1.  首次访问应用时，界面会提示“创建或输入您的同步令牌”。
    2.  用户输入一个自定义的、易于记忆的字符串（如 `yunyv-gre-mastery-2025`）。
    3.  后端验证该令牌的唯一性。若可用，则为该令牌创建专属数据空间；若已存在，则视为登录。
- **FR-1.2: 跨设备无缝同步**
  - **描述:** 用户可在任何受支持的设备上通过输入同一令牌，来完整恢复并同步所有学习数据。
  - **用户场景:** yunyv 在 Windows PC 上使用令牌 `yunyv-gre` 学习了一小时。之后打开 iPad 上的浏览器，在初始页面输入 `yunyv-gre`，页面将立即加载出他在 PC 上的所有词书和学习进度。
- **FR-1.3: 本地令牌缓存**
  - **描述:** 为提升日常使用便利性，系统会将当前已验证通过的令牌存储在浏览器的`localStorage`中。
  - **实现方式:** 使用 React Context API 管理认证状态，结合 localStorage 进行持久化存储。
  - **用户体验:** 在同一设备和浏览器上，用户只需输入一次令牌。后续访问将自动"登录"，无需重复输入。**清除浏览器缓存不会导致数据丢失**，只需重新输入令牌即可恢复所有云端数据。

#### **模块 2: 词书管理 (Wordlist Management)**

- **FR-2.1: 词书上传**
  - **描述:** 支持用户上传自定义的单词列表。
  - **支持格式:** `.txt` (每行一个单词), `.csv` (仅读取第一列)。
  - **交互:** 主页提供“上传新词书”入口。上传时，用户需为该词书命名（如“GRE 核心 3000”、“经济学人高频词”），以便后续管理。
- **FR-2.2: 词书库**
  - **描述:** 主页 Bento 网格中存在一个“我的词书”模块，集中展示和管理所有已上传的词书。
  - **功能:**
    - **列表展示:** 清晰列出所有词书的名称。
    - **激活词书:** 用户可以点击选择任意一本词书，作为当前要进行“学习”或“测试”的目标。
    - **删除词书:** 提供删除功能，允许用户移除不再需要的词书及其相关的所有学习进度。

#### **模块 3: 核心学习与测试流程 (Core Learning & Testing Flow)**

- **FR-3.1: 专注学习模式 (Focus Learning Mode)**
  - **用途:** 学习新单词。
  - **触发:** 在“我的词书”中选择一本词书，点击“开始学习”进入此模式。
  - **界面布局:**
    - **主区域:** 屏幕上一次仅显示一个英文单词，其位置在可视区域内**随机分布**。
    - **信息面板:** 默认隐藏。**单击单词**后，在单词旁浮现一个面板，展示其详细释义（来源于 Bing 词典）。再次单击单词则隐藏面板。
    - **控制区:** 界面角落提供一个固定的极简控制条，包含“随机打乱 (Shuffle)”按钮和一个设置(⚙️)图标。
  - **交互流程:**
    1.  进入模式，系统从当前激活词书中随机展示一个**未学习过**的单词。
    2.  用户看着单词，进行**主动回忆**。
    3.  用户**单击单词**查看释义，进行自我核对。释义通过 Next.js API 路由实时获取。
    4.  用户按下**键盘空格键**，当前单词消失，系统随机展示下一个未学习的单词。
    5.  在任何时候，用户可点击**"随机打乱"**按钮，当前屏幕上单词的位置会立即重新随机排列，以打破位置记忆。
    6.  当该词书中所有单词都被学习过一遍后，系统提示"本轮学习完成"。同时，Next.js API 将这批单词的学习记录（`user_id`, `word_id`, `review_stage=0`, `next_review_date=明天`）存入 MySQL 数据库。
- **FR-3.2: 全览测试模式 (All-View Test Mode)**
  - **用途:** 自我检测、手动复习、考前冲刺。
  - **触发:** 在“我的词书”中选择一本词书，点击“全览测试”进入此模式。
  - **界面布局:**
    - **主区域:** 将所选词书中的**所有英文单词**以卡片形式，随机散布在整个页面上。
    - **控制区:** 提供核心的**“随机打乱 (Shuffle)”**按钮和一个设置(⚙️)图标。
  - **交互流程:**
    1.  用户可以自由查看页面上的任何单词。
    2.  **单击**任意单词卡片可显示/隐藏其释义，用于自我核对。
    3.  用户可随时点击**“随机打乱”**按钮，所有单词卡片的位置会瞬间重新随机排列，强制大脑进行重新搜索和识别，有效对抗位置记忆。
    4.  此模式为纯粹的自我检测工具，**其任何操作不影响后台的艾宾浩斯复习计划**。

#### **模块 4: 科学复习系统 (Scientific Review System)**

- **FR-4.1: 复习中心 (Review Center)**
  - **描述:** 位于主页 Bento 网格的核心模块，是所有复习活动的总入口。
  - **构成:**
    - **智能复习 (Smart Review):**
      - **逻辑:** 后端根据`UserWordProgress`表，查询出所有`next_review_date`为今天及今天之前的单词。
      - **界面:** 在主页上显示一个醒目的数字，如“**今日待复习：25**”。
      - **流程:** 用户点击后，直接进入**专注学习模式**，但单词源为这些到期的复习词汇。每按一次空格键完成一个单词的复习，Next.js API 会自动更新其`review_stage`并计算下一个`next_review_date`。
- **FR-4.2: 艾宾浩斯记忆曲线逻辑**
  - **描述:** “智能复习”功能背后的核心调度算法。
  - **复习阶段 (Review Stage) 定义 (示例):**
    - `Stage 0` (新学): 复习周期为 1 天后
    - `Stage 1` (复习 1 次): 复习周期为 2 天后
    - `Stage 2` (复习 2 次): 复习周期为 4 天后
    - `Stage 3` (复习 3 次): 复习周期为 7 天后
    - `Stage 4` (复习 4 次): 复习周期为 15 天后
    - 以此类推，间隔逐渐拉长。
  - **后端要求:** 提供一个 API，当在“智能复习”模式下完成一个单词的复习时，前端调用该 API，后端负责将对应记录的`review_stage` + 1，并根据上述规则更新`next_review_date`和`last_reviewed_at`字段。

#### **模块 5: 学习界面自定义 (UI Customization)**

- **FR-5.1: 实时设置面板**
  - **描述:** 在**专注学习模式**和**全览测试模式**的控制条中，点击设置(⚙️)图标可弹出一个非侵入式的设置面板，允许用户实时调整学习环境。
  - **可配置项:**
    - **字体大小:** 滑块调节，支持大范围连续调整。
    - **信息面板宽度:** 滑块调节，支持从窄到宽的连续调整。
    - **自动发音:** 开关。开启后，单击单词显示释义时，自动播放美式发音。
    - **循环发音:** 开关。开启后，在信息面板中手动点击发音按钮，音频会循环播放，直到下一个单词的释义展开或当前释义被隐藏。
    - **即时巩固:** 开关（仅在**专注学习模式**下生效）。开启后，每学习 5 个新词，系统会自动插入一个对这 5 个词的快速回顾（打乱顺序，逐个呈现），然后再继续学习新词。

#### **模块 6: 即时词典内容获取 (JIT Content Fetching)**

- **FR-6.1: Just-In-Time (JIT) 获取策略**
  - **描述:** 为优化性能和资源利用，系统不预先加载整个词库的释义。采用“按需获取”并结合预加载的策略。
  - **技术流程:**
    1.  当学习/复习会话开始时，前端根据即将显示的单词顺序，向后端请求第一个单词的释义。
    2.  同时，前端会异步地**预先请求接下来 10 个单词的释义**并缓存，以确保用户按下空格键切换时能瞬时显示。
- **FR-6.2: 词典数据源与字段**
  - **数据源:** Bing 词典 (移动版)。
  - **需获取的数据字段:** 快速释义、权威英汉双解、英汉释义、英英释义、音标（英/美）、发音音频 URL（英/美）、高质量例句（最多 10 条，含翻译）、词形变换。
  - **后端任务:** 当后端收到一个在`Words`缓存表中不存在的单词请求时，Next.js API 路由触发爬虫任务抓取 Bing 词典数据，使用 Cheerio 解析 HTML，清洗后存入`Words`表，再返回给前端。
  - **实现技术:** 使用 Axios 发送 HTTP 请求，Cheerio 解析 HTML，TypeScript 定义数据结构。
- **FR-6.3: 错误处理**
  - **约定:** V1.0 版本假定 Bing 词典源稳定可靠，实现基本的错误处理和重试机制。
  - **网络错误:** 实现请求超时控制（10秒）和自动重试（最多3次）。
  - **解析错误:** 使用多重选择器策略，部分数据提取失败时不影响整体流程。
  - **降级方案:** 若因网络或反爬导致获取失败，则该单词的信息面板显示"释义获取失败"，并提供手动重试按钮。

---

### **3. 技术规格与非功能性需求 (Technical & Non-Functional Requirements)**

#### **3.1. 技术栈**
- **前端框架:** Next.js 15 + React 19 + TypeScript
- **UI 组件库:** Tailwind CSS + Shadcn/ui
- **状态管理:** React Hooks + Context API / Zustand
- **HTTP 客户端:** Axios / Fetch API
- **后端 API:** Next.js API Routes
- **爬虫库:** Axios + Cheerio
- **数据库:** MySQL 8.0
- **ORM:** Prisma / Sequelize
- **部署:** Vercel / 自托管 Node.js 服务器

#### **3.1.1. 前端架构设计 (React/Next.js)**

**组件层级结构:**
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
    - app/test/page.tsx (全览测试模式页)
      - components/WordGrid.tsx (负责渲染所有单词卡片的网格)
        - components/WordCard.tsx (单个单词卡片，可翻转)
    - app/token/page.tsx (令牌输入/验证页)
      - components/TokenInputForm.tsx
```

**状态管理结构:**
```typescript
// types/user.ts
export interface UserState {
  token: string | null;
  isAuthenticated: boolean;
  status: 'idle' | 'loading' | 'authenticated' | 'error';
}

// types/wordlist.ts
export interface Wordlist {
  id: number;
  name: string;
  wordCount: number;
  createdAt: string;
}

// types/learning.ts
export interface LearningState {
  sessionType: 'new' | 'review' | 'test' | null;
  wordQueue: string[];
  currentWordText: string | null;
  currentWordData: any | null;
  status: 'idle' | 'active' | 'finished';
}

// types/settings.ts
export interface SettingsState {
  fontSize: number;
  panelWidth: number;
  autoPlayAudio: boolean;
  loopAudio: boolean;
  instantConsolidation: boolean;
}
```

**核心组件接口定义:**
```typescript
// components/WordlistItem.tsx
interface WordlistItemProps {
  wordlist: Wordlist;
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
  config: SettingsState;
  onConfigChange: (newConfig: SettingsState) => void;
  onClose: () => void;
  isLearningMode?: boolean;
}
```

**前端目录结构:**
```
/src
  /app              # Next.js App Router
    /api             # API 路由
      /dictionary    # 词典 API
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
  /types            # TypeScript 类型定义
    /index.ts       # 导出所有类型
  /hooks            # 自定义 React Hooks
    - useDictionary.ts
    - useWordlist.ts
    - useSettings.ts
```

#### **3.2. 性能要求**

- **API 响应:** 单个单词释义的 API（无论是否命中缓存）响应时间应在 500ms 以内。
- **页面加载:** Next.js 静态生成页面应在 2 秒内完成首次内容绘制 (FCP)。
- **交互流畅性:** 点击"随机打乱"按钮，页面单词位置重排应在 100ms 内完成，视觉上无卡顿。

#### **3.3. 平台兼容性**

- **一级支持平台 (Tier 1):**
  - **Windows PC:** 最新版的 Chrome, Edge 浏览器。深度优化键盘交互体验。
- **二级支持平台 (Tier 2):**
  - **iPad:** 最新版的 Safari 浏览器。所有 UI 元素和交互必须对触控操作友好、响应灵敏。

#### **3.4. 开发与部署**

- **开发环境:** Node.js 18+，npm 或 yarn，VS Code
- **代码规范:** ESLint + Prettier，TypeScript 严格模式
- **测试框架:** Jest + React Testing Library
- **部署方式:** Vercel (推荐) 或自托管 Node.js 服务器
- **CI/CD:** GitHub Actions 自动化测试和部署

### **PRD 模块 6: 详细技术规格 - 词典内容获取**

#### **6.1. 模块概述**

本模块定义了从外部数据源（Bing词典）获取单个单词详细信息的技术流程和数据标准。后端服务需实现一个稳定的爬虫，该爬虫能够解析目标网页的HTML结构，提取指定信息，并将其格式化为统一的JSON对象。此JSON对象将作为API的响应体，并被持久化存储在数据库中。

#### **6.2. 数据源**

*   **唯一指定源:** 必应词典 (Bing Dictionary)
*   **目标URL格式:** `https://cn.bing.com/dict/search?q={word}` (例如: `https://cn.bing.com/dict/search?q=need`)

#### **6.3. 数据结构 (Data Schema) - API响应 & 数据库存储**

当后端成功获取一个单词的数据后，必须组装成以下结构的JSON对象。该对象是前后端交互的唯一标准，也将完整存入数据库的`Words`表中。

**JSON 结构定义:**

```json
{
  "word": "need",
  "pronunciation": {
    "us_phonetic": "[nid]",
    "us_audio_url": "/dict/mediamp3?blob=audio%2Ftom%2F26%2F31%2F26314F3C9A43E18D5F2E8DCD3149FCBF.mp3",
    "uk_phonetic": "[niːd]",
    "uk_audio_url": "/dict/mediamp3?blob=audio%2Fgeorge%2F26%2F31%2F26314F3C9A43E18D5F2E8DCD3149FCBF.mp3"
  },
  "quick_definitions": [
    {
      "pos": "n.",
      "definition": "需要；必须；特别需要；迫切要求"
    },
    {
      "pos": "v.",
      "definition": "需要；必需；（表示应该或不得不做）有必要"
    },
    {
      "pos": "auxv.",
      "definition": "必须；She need not go. 这句话"
    },
    {
      "pos": "modalv.",
      "definition": "（表示没有必要或询问是否有必要）需要"
    }
  ],
  "web_definition": [
    "需求",
    "的用法",
    "需要的"
  ],
  "authoritative_eng_chi": [
    {
      "pos": "v.",
      "definitions": [
        {
          "eng": "to require sth/sb because they are essential or very important, not just because you would like to have them",
          "chi": "需要；必需"
        },
        {
          "eng": "used to show what you should or have to do",
          "chi": "（表示应该或不得不做）有必要",
          "grammar_tag": "~ to do sth"
        }
      ]
    },
    {
      "pos": "modalv.",
      "definitions": [
        {
          "eng": "used to state that sth is/was not necessary or that only very little is/was necessary; used to ask if sth is/was necessary",
          "chi": "（表示没有必要或询问是否有必要）需要",
          "grammar_tag": "~ (not) do sth"
        }
      ]
    },
    {
      "pos": "n.",
      "definitions": [
        {
          "eng": "a situation when sth is necessary or must be done",
          "chi": "需要；必须",
          "grammar_tag": "[sing], [u]"
        },
        {
          "eng": "a strong feeling that you want sb/sth or must have sth",
          "chi": "特别需要；迫切要求",
          "grammar_tag": "[c], [u]"
        },
        {
          "eng": "the things that sb requires in order to live in a comfortable way or achieve what they want",
          "chi": "需要的事物；欲望",
          "grammar_tag": "[c], [usupl]"
        },
        {
          "eng": "the state of not having enough food, money or support",
          "chi": "（食物、钱或生活来源的）短缺，缺乏",
          "grammar_tag": "[u]"
        }
      ]
    }
  ],
  "eng_chi": [
    {
      "pos": "n.",
      "definitions": [ "必要,需要", "需求;需用的东西", "缺乏,不足", "贫穷", "危急的时候,一旦有事的时候" ]
    },
    {
      "pos": "v.",
      "definitions": [ "要,需要,必须,有...的必要", "〈古〉需要", "生活贫困" ]
    },
    {
      "pos": "auxv.",
      "definitions": [ "不得不,必须", "She need not go. 这句话,口语常说作 She doesn't need [have] to go" ]
    }
  ],
  "eng_eng": [
    {
      "pos": "n.",
      "definitions": [ "a situation in which it is necessary for something to be done; something that you need in order to be healthy, comfortable, successful, etc." ]
    },
    {
      "pos": "v.",
      "definitions": [ "if you need something, you must have it because it is necessary; used for saying whether it is necessary to do something; used for saying whether it is necessary for a particular situation to exist", "used for emphasizing that something should be done" ]
    }
  ],
  "example_sentences": [
    {
      "english": "If you are going to lead an Agile team, you need to have the courage to speak the truth and let your team members speak the truth as well.",
      "chinese": "如果你准备去领导一个Agile团队，你需要拥有勇气说出事实，并鼓励你的团队成员也说出事实。",
      "audio_url": "/dict/mediamp3?blob=audio%2Ftom%2Fb8%2Fa2%2FB8A22B7CAF15A31D36882B6E181743F5.mp3",
      "source": "www.ibm.com"
    },
    {
      "english": "If the result of the assessment need to be published to the public, do you think you will put more effort to improve the energy performance?",
      "chinese": "若审核结果需向公众公布，你是否会投放更多资源以改善楼宇能源使用之表现？",
      "audio_url": "/dict/mediamp3?blob=audio%2Ftom%2Fbb%2F7f%2FBB7FE73FFB12E7D8F70DF34F75EF422D.mp3",
      "source": "my3q.com"
    }
  ]
}
```

---

#### **6.4. HTML 解析逻辑与 CSS 选择器 (Node.js + Cheerio 实现)**

以下是针对当前实现的精确解析规则，基于 Bing 词典移动版页面的结构。

**1. 基本释义提取**
*   **容器选择器:** `#client_def_container:first .client_def_bar`
*   **词性选择器:** `.client_def_title_bar .client_def_title`
*   **释义选择器:** `.client_def_list_word_bar`
*   **网络释义识别:** 检查 `.client_def_title_web` 元素是否存在且文本为"网络"

**2. 词形变换提取**
*   **容器选择器:** `#client_word_change_def .client_word_change_word`
*   **词形类型:** 获取 `title` 属性
*   **变换后单词:** 获取 `textContent`

**3. 权威英汉释义提取**
*   **容器选择器:** `#clientnlid`
*   **词性区块:** `.defeachseg`
*   **词性选择器:** `.defeachhead .defpos`
*   **释义条目:** `.deflistitem`
*   **释义编号:** `.defnum`
*   **中文释义:** `.defitemcon .itemname`
*   **英文释义:** `.defitemcon .itmeval`
*   **例句列表:** `.exambar .examlistitem`

**4. 英汉释义提取**
*   **容器选择器:** `#clientcrossid`
*   **词性区块:** `.client_def_bar`
*   **词性选择器:** `.client_def_title_bar .client_def_title`
*   **释义条目:** `.client_def_list_item`
*   **释义编号:** `.client_def_list_word_num`
*   **释义内容:** `.client_def_list_word_bar`

**5. 英英释义提取**
*   **容器选择器:** `#clienthomoid`
*   **词性区块:** `.client_def_bar`
*   **词性选择器:** `.client_def_title_bar .client_def_title`
*   **释义条目:** `.client_def_list_item`
*   **链接单词选择器:** `.client_def_list_word_en`

**6. 音标和音频数据提取**
*   **发音列表容器:** `.client_def_hd_pn_list`
*   **音标文本:** `.client_def_hd_pn`
*   **音频 URL:** `.client_aud_o` 的 `data-pronunciation` 属性
*   **美式发音识别:** 文本包含"美:"
*   **英式发音识别:** 文本包含"英:"

**7. 例句数据提取**
*   **例句列表容器:** `.client_sentence_list`
*   **例句编号:** `.client_sentence_list_num`
*   **英文例句:** `.client_sen_en`
*   **中文例句:** `.client_sen_cn`
*   **音频 URL:** `.client_bdsen_audio` 的 `data-mp3link` 属性
*   **来源链接:** `.client_sen_link`
*   **高亮单词:** `.client_sentence_search, .client_sen_en_word, .client_sen_cn_word`

**8. 错误处理和容错机制**
*   **多重选择器策略:** 为每个数据字段提供多个备选选择器
*   **空值检查:** 所有提取操作都进行空值验证
*   **异常捕获:** 每个提取函数都包含 try-catch 块
*   **日志记录:** 详细记录提取过程中的错误和警告

---

#### **6.5. API 规范**

**Endpoint:** `GET /api/dictionary`

**描述:**
获取指定单词的详细词典信息。此API会首先检查数据库缓存。如果命中缓存，则直接返回数据库中的JSON数据。如果未命中，则触发实时爬虫任务，获取数据，存入数据库，然后返回给客户端。

**查询参数:**
*   `word` (string, required): 需要查询的英文单词。
*   `type` (string, optional): 释义类型，可选值: 'all', 'authoritative', 'bilingual', 'english'，默认为 'all'。
*   `test` (boolean, optional): 测试模式，设置为 'true' 时分析网站结构而非提取单词数据。

**认证:**
*   需要通过请求头传递有效的用户令牌 (Token)。

**响应:**
*   **`200 OK` (成功):**
    *   **Content-Type:** `application/json`
    *   **Body:** 包含单词释义的JSON对象，格式如下：
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

*   **`404 Not Found` (单词不存在):**
    *   **场景:** 在Bing词典上无法找到该单词的页面。
    *   **Content-Type:** `application/json`
    *   **Body:**
        ```json
        {
          "success": false,
          "error": "Word not found",
          "message": "The word '{word_text}' could not be found in the dictionary."
        }
        ```

*   **`500 Internal Server Error` (爬取或解析失败):**
    *   **场景:** 网络请求失败、Bing页面结构变更导致解析失败等服务器端错误。
    *   **Content-Type:** `application/json`
    *   **Body:**
        ```json
        {
          "success": false,
          "error": "Failed to fetch word data",
          "message": "An unexpected error occurred while fetching data from the dictionary source."
        }
        ```

#### **6.6. 数据库存储模型**

**表名:** `Words` (全局单词缓存表)

**字段:**
*   `id` (INT, Primary Key, Auto Increment)
*   `word_text` (VARCHAR(100), UNIQUE): 单词的文本形式，例如 "need"。
*   `definition_data` (JSON): 用于存储从爬虫获取并格式化后的完整JSON对象。MySQL 8.0 原生支持JSON类型，可以提供灵活的查询能力并避免复杂的表结构。
*   `created_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP): 记录创建时间。
*   `updated_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP): 记录最后更新时间（用于未来可能的重新爬取策略）。

**MySQL 8.0 特定优化:**
*   使用 MySQL 8.0 的原生 JSON 类型，支持高效的 JSON 查询和索引
*   可以在 `word_text` 字段上创建 B-tree 索引以提高查询性能
*   可以在 `definition_data` 中的特定 JSON 路径上创建生成列和索引

#### **6.7. 爬虫实现细节 (Node.js + Cheerio)**

**技术栈:**
*   **HTTP 客户端:** Axios (支持请求拦截、超时控制、错误处理)
*   **HTML 解析:** Cheerio (服务器端的 jQuery 实现，轻量且高效)
*   **目标 URL:** `https://cn.bing.com/dict/clientsearch?mkt=zh-CN&setLang=zh&form=BDVEHC&ClientVer=BDDTV3.5.1.4320&q={word}`

**爬虫流程:**
1. **请求配置:**
   ```javascript
   const headers = {
     'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
     'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
     'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
     'Accept-Encoding': 'gzip, deflate, br',
     'Connection': 'keep-alive'
   };
   ```

2. **数据提取策略:**
   - 使用 Cheerio 加载返回的 HTML
   - 采用 CSS 选择器而非 XPath 进行元素定位
   - 实现多重选择器策略以提高容错性

3. **核心数据结构 (TypeScript 接口):**
   ```typescript
   interface PronunciationData {
     american?: {
       phonetic: string;
       audioUrl: string;
     };
     british?: {
       phonetic: string;
       audioUrl: string;
     };
   }
   
   interface AuthoritativeDefinition {
     partOfSpeech: string;
     definitions: Array<{
       number: number;
       chineseMeaning: string;
       englishMeaning: string;
     }>;
   }
   
   // 其他接口定义...
   ```

4. **错误处理机制:**
   - 网络超时处理 (10秒超时)
   - 连接失败重试机制
   - 结构化错误日志记录
   - 优雅降级：部分数据提取失败时不影响整体流程

5. **性能优化:**
   - 请求结果缓存 (避免重复爬取)
   - 并发控制 (限制同时进行的爬虫请求数)
   - 增量更新 (只更新变化的数据)

### **4. 版本规划与未来展望**

#### **4.1. V1.0 发布范围**

本文档中描述的**所有功能**（模块 1 至模块 6）均包含在 V1.0 的开发和交付范围内。目标是上线一个功能完整、体验高度抛光的版本。

#### **4.2. 未来展望**

V1.0 是为满足核心需求而设计的坚实基础。未来的迭代方向将**完全由项目负责人 [yunyv] 的个人使用体验和新需求驱动**。潜在的探索方向可能包括但不限于：拼写测试模式、集成更多词典源、支持 Anki 词库导入等。
