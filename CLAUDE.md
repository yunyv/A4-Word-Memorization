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
- **环境一致性**: 提供的所有命令、脚本和操作指南必须与 Windows 11 和 Powershell 环境完全兼容。
- **语言规范**: 始终使用中文进行所有的沟通、注释和文档编写。
- **明确性**: 当遇到信息不明确或上下文不足以做出判断时，应主动提出问题以寻求澄清，而不是进行猜测。

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

- **实用错误处理 (Pragmatic Error Handling):** 核心目标是防止程序因**可预见的**错误而崩溃。
- **聚焦边界条件 (Focused Boundary Conditions):** 避免对未来不确定的输入进行过度防御性编程。首先确保正常流程和最常见的异常流程能够稳定工作。
- **可测试性**: 生成的代码必须易于进行单元测试和集成测试。

**4. 简洁性 (Simplicity):**

- **KISS 原则**: (Keep It Simple, Stupid) 严禁过度设计。
- **DRY 原则**: (Don't Repeat Yourself) 杜绝复制代码。将重复的逻辑抽象成可复用的函数、钩子或组件。
- **YAGNI 原则**: (You Aren't Gonna Need It) 不要编写当前不需要的功能。禁止为“未来可能的需求”进行猜测性开发。

**5. 效率 (Efficiency):**

- **性能意识**: 在关键代码路径上，关注算法的时间和空间复杂度。
- **避免过早优化**: 将可读性和可维护性置于微小性能优化之上。只有在明确存在性能瓶颈时，才进行针对性优化。

注意：写完代码后使用 npm run build，转换成 plan mode ，自己查看有没有明显的错误

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**A4 Recite - 专注单词记忆** 是基于 A4 纸背单词法的数字化词汇学习工具，采用艾宾浩斯遗忘曲线科学记忆管理。这是一个成熟的教育应用，无需用户注册，使用简单令牌认证系统。

### 核心功能

- 令牌认证系统（无需注册）
- 词书管理和上传
- 艾宾浩斯记忆曲线算法
- 多种学习模式（新词学习、复习、测试）
- 多源词典集成（基础释义、权威释义、英汉释义、英英释义、网络释义）
- 学习进度跟踪和统计
- 响应式设计和用户设置管理

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

## 技术栈

- **前端**: Next.js 15 (App Router), React 19, TypeScript
- **样式**: Tailwind CSS 4, Radix UI 组件
- **后端**: Next.js API Routes
- **数据库**: Prisma ORM with MySQL
- **认证**: 令牌认证系统
- **爬虫**: Cheerio, Axios
- **缓存**: 本地存储和 API 缓存

## 架构概览

### 目录结构

```
src/
├── app/                    # Next.js App Router 页面
│   ├── api/               # API 路由（按领域组织）
│   ├── dashboard/         # 仪表盘功能
│   ├── learning/          # 学习模块
│   ├── settings/          # 用户设置
│   └── token/             # 令牌认证页面
├── components/            # React 组件
│   ├── ui/                # 基础 UI 组件
│   ├── auth/              # 认证相关组件
│   ├── dashboard/         # 仪表盘组件
│   └── learning/          # 学习界面组件
├── hooks/                 # 自定义 React hooks
├── lib/                   # 业务逻辑工具
└── types/                 # TypeScript 类型定义
```

### 路径别名

- `@/*` 映射到 `src/*`，在导入时使用 `@/components/...` 等格式

## 开发模式与约定

### 1. API 路由模式

API 路由按领域组织，遵循 RESTful 约定：

- `/api/token` - 用户认证和管理
- `/api/wordlists` - 词书 CRUD 操作
- `/api/dictionary` - 单词释义爬取和缓存
- `/api/learning` - 学习会话管理
- `/api/review` - 进度跟踪和调度
- `/api/cache` - 缓存管理工具

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

- **User**: 令牌认证用户管理
- **Wordlist**: 用户词书管理
- **Word**: 全局单词缓存表
- **WordDefinition**: 多类型释义存储（basic/web/authoritative/bilingual/english）
- **WordPronunciation**: 美式/英式发音
- **WordSentence**: 单词例句
- **DefinitionExample/DefinitionIdiom**: 释义的例句和习语
- **UserWordProgress**: 用户学习进度跟踪（艾宾浩斯曲线）

### 关键设计特点

- 支持多种释义类型，每种类型有不同的数据结构
- 层次化数据组织：单词 → 释义 → 例句/习语
- 用户进度跟踪包含复习阶段和下次复习时间
- 级联删除保证数据一致性

## 开发指南

### 添加新功能的标准流程

1. 在 `src/types/` 中定义相关类型
2. 在 `src/lib/` 中实现业务逻辑
3. 在 `src/app/api/` 中创建 API 路由
4. 在 `src/hooks/` 中创建自定义 hook
5. 在 `src/components/` 中创建 UI 组件
6. 在相应页面中使用组件

### 数据库操作原则

- 所有数据库操作通过 Prisma 客户端进行
- 修改 schema 后必须运行 `npx prisma generate` 和 `npx prisma db push`
- 使用事务处理复杂的数据操作
- 注意级联删除的影响

### 认证系统

- 使用令牌认证，无需用户注册
- 令牌通过 header 或 cookie 传递
- 自动用户创建：首次使用令牌时自动创建用户账户

### 学习算法实现

- 基于艾宾浩斯遗忘曲线的间隔重复
- 递进式复习阶段管理
- 根据用户表现智能调度下次复习时间
- 支持多种学习模式（新词、复习、测试）

### 缓存策略

- 词典 API 响应缓存减少外部调用
- 本地存储优化用户体验
- 支持预加载词书缓存
- 可配置的缓存清理机制

### UI/UX 开发

- 响应式设计适配各种设备
- 使用 Tailwind CSS 保持设计一致性
- Radix UI 组件提供可访问性支持
- 加载状态和错误处理的优雅实现

## 重要注意事项

- 这是一个生产级的教育应用，代码质量要求高
- 所有新功能必须考虑用户体验和性能影响
- 数据库模式变更需要谨慎处理，考虑数据迁移
- 词典爬虫功能需要处理各种异常情况和反爬措施
- 学习算法的准确性直接影响用户体验，需要充分测试
