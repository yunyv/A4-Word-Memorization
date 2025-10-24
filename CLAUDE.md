# agent.md

本文档定义了 AI 代理在当前项目中的工作环境、技术栈及核心行为准则。所有操作和响应都必须严格遵守此规范。

### **环境配置**

- **操作系统**: Windows 11
- **默认 Shell**: Powershell
- **数据库**: MySQL 8.0
  - **用户名**: root
  - **密码**: 123456
- **前端包管理器**: npm (适用于所有前端项目)

### **技术栈**

- **前端框架**: Next.js 15 + React 19 + TypeScript
- **UI 组件库**: Tailwind CSS + Shadcn/ui
- **状态管理**: React Hooks + Context API / Zustand
- **HTTP 客户端**: Axios / Fetch API
- **后端 API**: Next.js API Routes
- **爬虫库**: Axios + Cheerio
- **数据库**: MySQL 8.0
- **ORM**: Prisma / Sequelize
- **部署**: Vercel / 自托管 Node.js 服务器

### **指导原则**

- **忠于事实**: 严格基于项目提供的文件和上下文进行分析与回答。禁止凭空杜撰或猜测任何未明确定义的函数、API 接口、文件路径或配置信息。
- **上下文优先 (Context First)**: 在制定任何行动计划或编写/修改任何代码之前，必须优先、广泛地阅读和理解相关的代码库。这包括但不限于：目标文件、被引用的组件、相关的 API 路由、类型定义以及项目文档。目标是确保新的实现与现有架构、模式和逻辑保持一致，避免重复造轮子，并准确评估变更可能带来的影响。
- **环境一致性**: 提供的所有命令、脚本和操作指南必须与 Windows 11 和 Powershell 环境完全兼容。
- **语言规范**: 始终使用中文进行所有的沟通、注释和文档编写。
- **明确性**: 当遇到信息不明确或上下文不足以做出判断时，应主动提出问题以寻求澄清，而不是进行猜测。
- **价值驱动与务实主义 (Value-Driven & Pragmatic)**: 所有工程决策的首要目标是尽快交付对用户有价值的功能。在遵守编码准则时，应具备优先级意识。系统的核心稳定性、数据一致性和关键业务逻辑必须得到最高标准的保障。对于非核心、易于修改的部分，可以在有意识地记录技术债（例如使用 `TODO` 注释）的前提下，采取更快捷的实现方式，以确保迭代速度。

### **编码准则 (Code Quality Standards)**

你生成的代码必须像一座设计精良的建筑：结构稳固、功能清晰、易于扩展和维护。必须严格遵循以下准则：

**1. 可读性 (Readability):**

- **清晰命名**: 变量、函数、类的命名必须准确反映其用途。
- **一致风格**: 严格遵循项目既定的编码规范。

**2. 可维护性 (Maintainability):**

- **低耦合**: 设计模块时，确保它们之间的依赖关系最小化，避免连锁反应式的修改。
- **高内聚**: 每个模块/文件/函数/类只负责一件事情，并将相关功能组织在一起。
- **模块化**: 将复杂系统拆分为小的、独立的、可复用的单元。
- **禁止硬编码**: 绝不使用魔法数字或硬编码字符串。将它们定义为常量或配置文件中的变量。

**3. 健壮性 (Robustness):**

- **杜绝 `any`**: 在编写 TypeScript 代码时，必须使用明确的类型定义，禁止使用或隐式推导为 `any` 类型。
- **实用错误处理 (Pragmatic Error Handling):** 在修复错误的功能或者是 bug 时，只需要修复错误即可，拒绝因为一个简单的错误而添加复杂的校验机制。
- **聚焦边界条件 (Focused Boundary Conditions):** 避免对未来不确定的输入进行过度防御性编程。首先确保正常流程和最常见的异常流程能够稳定工作。

**4. 简洁性 (Simplicity):**

- **KISS 原则**: (Keep It Simple, Stupid) 严禁过度设计。
- **DRY 原则 (务实的抽象)**: (Don't Repeat Yourself) 杜绝复制代码是长期目标，但应避免过早和不成熟的抽象。当一段逻辑在**两个以上**的地方重复出现，且其共性已经明确时，应立即进行重构。对于仅出现两次且未来演化方向不明确的逻辑，可暂时容忍重复，并添加 `// TODO: Refactor needed if this logic is used elsewhere` 注释，以待后续处理。
- **YAGNI 原则**: (You Aren't Gonna Need It) 不要编写当前不需要的功能。禁止为“未来可能的需求”进行猜测性开发。

**5. 效率 (Efficiency):**

- **性能意识**: 在关键代码路径上，关注算法的时间和空间复杂度。
- **避免过早优化**: 将可读性和可维护性置于微小性能优化之上。只有在明确存在性能瓶颈时，才进行针对性优化。

---

### **最终校验步骤 (Final Verification Step)**

> **代码编写完成后，必须执行 `npm run build` 以检查是否存在编译错误。然后，切换到计划模式（Plan Mode）并自我审查，确保没有明显的逻辑或实现错误。**

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**A4 Recite - 专注单词记忆** 是基于 A4 纸背单词法的数字化词汇学习工具，采用艾宾浩斯遗忘曲线科学记忆管理。这是一个成熟的教育应用，无需用户注册，使用简单令牌认证系统。

### 核心功能

- 令牌认证系统（无需注册）
- 词书管理和上传（支持 .txt/.csv 文件）
- 艾宾浩斯记忆曲线算法（递进式复习阶段管理）
- 多种学习模式（新词学习、复习、测试）
- 多源词典集成（基础释义、权威释义、英汉释义、英英释义、网络释义）
- 学习进度跟踪和统计（详细进度可视化）
- 响应式设计和用户设置管理
- 智能缓存系统（减少外部 API 调用）
- 数据迁移和修复工具

## 开发命令

### 基础开发命令

```bash
npm run dev          # 启动开发服务器
npm run build        # 生产构建
npm run start        # 启动生产服务器
npm run lint         # ESLint 检查
```

### 数据库操作

```bash
npx prisma generate  # 生成 Prisma 客户端
npx prisma db push   # 推送数据库模式变更
npx prisma studio    # 打开数据库管理界面
```

### 数据迁移工具

```bash
npm run migration:migrate     # 执行数据迁移
npm run migration:validate   # 验证数据完整性
npm run migration:repair     # 修复数据问题
npm run migration:full       # 完整迁移流程（验证+迁移+修复）
npm run migration:test       # 测试迁移脚本
```

## 技术栈

- **前端**: Next.js 15 (App Router), React 19, TypeScript 5
- **样式**: Tailwind CSS 4, Radix UI 组件, Lucide React 图标
- **后端**: Next.js API Routes
- **数据库**: MySQL 8.0 with Prisma ORM 6.17.1
- **认证**: 自定义令牌认证系统（无需注册）
- **爬虫**: Cheerio 1.1.2, Axios 1.12.2, XPath 解析
- **缓存**: 本地存储和 API 缓存系统
- **开发工具**: ESLint 9, ts-node, Commander.js（CLI 工具）

## 架构概览

### 目录结构

```
src/
├── app/                    # Next.js App Router 页面
│   ├── api/               # API 路由（按领域组织）
│   │   ├── cache/         # 缓存管理 API
│   │   ├── dictionary/    # 词典爬取 API
│   │   ├── learning/      # 学习会话 API
│   │   ├── review/        # 复习进度 API
│   │   ├── token/         # 令牌验证 API
│   │   ├── wordlists/     # 词书管理 API
│   │   └── words/         # 单词查询 API
│   ├── dashboard/         # 仪表盘功能
│   ├── learning/          # 学习模块
│   │   └── focus/         # 专注学习界面
│   ├── settings/          # 用户设置
│   └── token/             # 令牌认证页面
├── components/            # React 组件
│   ├── ui/                # 基础 UI 组件（Shadcn/ui）
│   ├── auth/              # 认证相关组件
│   ├── dashboard/         # 仪表盘组件
│   └── learning/          # 学习界面组件
├── hooks/                 # 自定义 React hooks
│   ├── useAuth.ts         # 认证状态管理
│   ├── useLearning.ts     # 学习进度管理
│   ├── useWordlist.ts     # 词书管理
│   └── useDefinitionSettings.ts # 释义设置
├── lib/                   # 业务逻辑工具
│   ├── auth.ts            # 认证逻辑
│   ├── cacheUtils.ts      # 缓存工具
│   ├── db.ts              # 数据库连接
│   ├── dictionary.ts      # 词典爬虫
│   ├── definitionSettings.ts # 释义设置
│   └── utils.ts           # 通用工具
├── types/                 # TypeScript 类型定义
└── scripts/               # 数据迁移脚本
    ├── enhanced-migrate-word-data.ts
    ├── enhanced-data-validator.ts
    ├── data-cleanup-and-repair.ts
    └── run-migration.ts
```

### 路径别名

- `@/*` 映射到 `src/*`，在导入时使用 `@/components/...` 等格式

## 开发模式与约定

### 1. API 路由模式

API 路由按领域组织，遵循 RESTful 约定：

- `/api/token/validate` - 令牌验证
- `/api/wordlists` - 词书 CRUD 操作
- `/api/wordlists/[id]` - 特定词书操作
- `/api/dictionary` - 词典查询和缓存
- `/api/dictionary/fetch` - 主动爬取词典
- `/api/learning/initialize` - 学习会话初始化
- `/api/review/due` - 获取待复习单词
- `/api/review/progress/[wordId]` - 更新学习进度
- `/api/cache` - 缓存管理
- `/api/words/by-text` - 按文本查询单词

### 2. 组件组织模式

- 基础 UI 组件放在 `components/ui/`
- 功能特定组件按功能域组织（auth/, dashboard/, learning/）
- 使用 TypeScript 严格类型检查
- 组件 props 接口清晰定义

### 3. 状态管理模式

- 使用自定义 hooks 封装业务逻辑（`useAuth`, `useLearning`, `useWordlist`）
- 认证状态通过 `useAuth` hook 管理
- 学习进度通过 `useLearning` hook 管理

### 4. 错误处理和加载状态

- 所有 API 调用包含错误处理
- 使用加载状态提升用户体验
- 优雅的错误提示和边界处理

## 数据库架构

### 核心数据模型

#### 用户和词书管理
- **User**: 令牌认证用户管理（id, token, created_at）
- **Wordlist**: 用户词书管理（id, user_id, name, created_at）
- **WordlistEntry**: 词书和单词的多对多关联（wordlist_id, word_id）

#### 单词数据体系
- **Word**: 全局单词缓存表（id, word_text, status, pronunciation）
  - `status` 字段跟踪数据获取状态（PENDING/PROCESSING/COMPLETED/FAILED）
- **WordDefinition**: 多类型释义存储
  - 支持 5 种释义类型：basic/web/authoritative/bilingual/english
  - 不同类型使用不同的字段结构（meaning, chinese_meaning, english_meaning, linked_words）
- **WordPronunciation**: 发音数据（american/british 类型，phonetic, audio_url）
- **WordSentence**: 单词例句（english, chinese, audio_url, source）
- **WordForm**: 词形变换（plural, past_tense 等形式）

#### 释义扩展数据
- **DefinitionExample**: 释义例句（按 definition_id 组织，支持排序）
- **DefinitionIdiom**: 释义习语（title, meaning）
- **IdiomExample**: 习语例句（与 DefinitionIdiom 关联）

#### 学习系统
- **UserWordProgress**: 用户学习进度跟踪
  - review_stage：复习阶段（艾宾浩斯曲线）
  - next_review_date：下次复习日期
  - last_reviewed_at：最后复习时间

### 关键设计特点

- **多源释义支持**: 每种释义类型有不同的数据结构，适应不同词典源
- **层次化数据组织**: 单词 → 释义 → 例句/习语的清晰层次
- **智能状态管理**: Word 表的 status 字段支持爬虫状态跟踪
- **艾宾浩斯算法**: UserWordProgress 实现科学复习调度
- **级联删除**: 完整的外键约束保证数据一致性
- **性能优化**: 关键字段建立索引，支持高效查询

## 开发指南

### 添加新功能的标准流程

1. 在 `src/types/` 中定义相关类型
2. 在 `src/lib/` 中实现业务逻辑
3. 在 `src/app/api/` 中创建 API 路由
4. 在 `src/hooks/` 中创建自定义 hook
5. 在 `src/components/` 中创建 UI 组件
6. 在相应页面中使用组件

### 数据库操作原则

- 所有数据库操作通过 Prisma 客户端进行（`src/lib/db.ts`）
- 修改 schema 后必须运行 `npx prisma generate` 和 `npx prisma db push`
- 使用事务处理复杂的数据操作
- 注意级联删除的影响
- 数据库连接测试：使用 `testDatabaseConnection()` 函数

### 数据迁移工作流程

**数据迁移工具使用场景：**
- 数据库结构变更后的数据迁移
- 词典数据格式升级
- 数据完整性修复
- 批量数据处理

**标准迁移流程：**
```bash
# 1. 验证当前数据状态
npm run migration:validate

# 2. 执行数据迁移
npm run migration:migrate

# 3. 修复发现的问题
npm run migration:repair

# 4. 完整流程（推荐）
npm run migration:full
```

**迁移脚本特点：**
- 支持批处理避免内存溢出
- 详细的进度监控和日志记录
- 自动重试机制处理网络问题
- 数据验证确保迁移完整性

### 认证系统

- 使用自定义令牌认证，无需用户注册
- 令牌通过 header 或 cookie 传递
- 自动用户创建：首次使用令牌时自动创建用户账户
- 认证逻辑封装在 `src/lib/auth.ts` 和 `useAuth` hook 中

### 学习算法实现

- 基于艾宾浩斯遗忘曲线的间隔重复算法
- 递进式复习阶段管理（review_stage 字段）
- 智能调度下次复习时间（next_review_date）
- 支持多种学习模式（新词、复习、测试）
- 学习状态跟踪通过 `UserWordProgress` 表

### 词典爬虫系统

- 多源词典数据爬取（基础、权威、英汉、英英释义）
- 爬虫逻辑在 `src/lib/dictionary.ts` 中
- 状态跟踪避免重复爬取（Word.status 字段）
- 支持多种解析方式：Cheerio + XPath
- 缓存机制减少外部 API 调用

### 缓存策略

- 词典 API 响应缓存减少外部调用
- 本地存储优化用户体验
- 支持预加载词书缓存
- 可配置的缓存清理机制
- 缓存工具在 `src/lib/cacheUtils.ts` 中

### UI/UX 开发

- 响应式设计适配各种设备
- 使用 Tailwind CSS 4 保持设计一致性
- Radix UI 组件提供可访问性支持
- Lucide React 图标库
- 加载状态和错误处理的优雅实现
- 错误边界组件防止应用崩溃

## 重要注意事项

- 这是一个生产级的教育应用，代码质量要求高
- 所有新功能必须考虑用户体验和性能影响
- 数据库模式变更需要谨慎处理，考虑数据迁移
- 词典爬虫功能需要处理各种异常情况和反爬措施
- 学习算法的准确性直接影响用户体验，需要充分测试
- 使用数据迁移工具进行大规模数据操作，避免手动 SQL 操作
