# A4 Recite - 专注单词记忆

基于 A4 纸背单词法的数字化学习工具，采用艾宾浩斯记忆曲线，帮助用户高效记忆单词。

## 功能特点

- 🔐 **令牌认证系统** - 无需注册账户，使用简单令牌即可登录
- 📚 **词书管理** - 上传、管理、删除个人词书
- 🧠 **艾宾浩斯复习算法** - 科学记忆曲线，智能安排复习计划
- 📖 **多种学习模式** - 专注学习、复习、测试三种模式
- 🎯 **专注学习模式** - 创新的拖拽式单词卡片交互，支持物理碰撞效果
- 🎵 **音频播放** - 自动播放单词发音，支持美式和英式发音
- 📝 **多类型释义** - 权威英汉、英汉、英英、基本释义、网络释义等多种释义类型
- 📊 **学习进度跟踪** - 详细的学习统计和进度可视化
- 🗂️ **词典 API 缓存** - 提高响应速度，减少网络请求
- 📱 **响应式设计** - 适配各种设备屏幕尺寸
- ⚡ **错误处理和加载状态** - 优雅的错误提示和加载动画

## 技术栈

- **前端**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **后端**: Next.js API Routes
- **数据库**: Prisma, MySQL
- **部署**: Vercel (推荐)

## 快速开始

### 环境要求

- Node.js 18.0 或更高版本
- npm 或 yarn

### 安装步骤

1. 克隆项目

```bash
git clone https://github.com/your-username/a4-recite.git
cd a4-recite
```

2. 安装依赖

```bash
npm install
# 或
yarn install
```

3. 配置环境变量

```bash
cp .env.example .env.local
```

编辑 `.env.local` 文件，配置数据库连接等环境变量。

4. 生成 Prisma 客户端

```bash
npx prisma generate
```

5. 运行数据库迁移

```bash
npx prisma db push
```

6. 启动开发服务器

```bash
npm run dev
# 或
yarn dev
```

7. 打开浏览器访问 [http://localhost:3000](http://localhost:3000)

## 使用指南

### 1. 获取认证令牌

访问 `/token` 页面，输入任意令牌即可登录。系统会自动创建用户账户。

### 2. 上传词书

在仪表盘页面，点击"上传词书"按钮，选择包含单词列表的 `.txt` 或 `.csv` 文件。文件格式要求：

- 每行一个单词
- 单词应为纯英文，不含标点符号
- 文件大小不超过 5MB

### 3. 开始学习

选择学习模式：

- **新模式**: 学习新单词
- **复习模式**: 复习待复习的单词
- **测试模式**: 测试单词掌握程度

### 4. 管理缓存

在设置页面，可以：

- 预加载词书缓存，提高学习体验
- 清理过期缓存，释放存储空间

## 项目结构

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API路由
│   │   ├── cache/         # 缓存管理API
│   │   ├── dictionary/    # 词典API
│   │   │   └── fetch/     # 词典数据获取API
│   │   ├── learning/      # 学习相关API
│   │   │   └── initialize/ # 学习初始化API
│   │   ├── review/        # 复习进度API
│   │   │   ├── due/       # 待复习单词API
│   │   │   └── progress/  # 复习进度更新API
│   │   ├── token/         # 令牌验证API
│   │   │   └── validate/  # 令牌验证端点
│   │   ├── wordlists/     # 词书管理API
│   │   └── words/         # 单词查询API
│   │       └── by-text/   # 按文本查询单词
│   ├── dashboard/         # 仪表盘页面
│   ├── learning/          # 学习页面
│   │   ├── focus/         # 专注学习模式
│   │   │   ├── components/ # 专注学习组件
│   │   │   │   ├── audio/ # 音频播放组件
│   │   │   │   ├── definition-panel/ # 释义面板组件
│   │   │   │   ├── drag-drop/ # 拖拽交互组件
│   │   │   │   ├── hooks/ # 自定义Hook
│   │   │   │   ├── keyboard/ # 键盘事件组件
│   │   │   │   ├── physics/ # 物理引擎组件
│   │   │   │   ├── types/ # 类型定义
│   │   │   │   ├── ui-controls/ # UI控件
│   │   │   │   └── word-cards/ # 单词卡片组件
│   │   │   └── page.tsx   # 专注学习页面
│   │   └── test/          # 测试模式
│   │       └── [wordlistId]/ # 测试模式页面
│   ├── settings/          # 设置页面
│   ├── test-scraper/      # 词典爬虫测试页面
│   ├── token/             # 令牌页面
│   ├── globals.css        # 全局样式
│   ├── layout.tsx         # 根布局
│   └── page.tsx           # 首页
├── components/            # React组件
│   ├── ui/                # UI组件库
│   │   ├── button.tsx     # 按钮组件
│   │   ├── card.tsx       # 卡片组件
│   │   ├── input.tsx      # 输入框组件
│   │   ├── slider.tsx     # 滑块组件
│   │   ├── tabs.tsx       # 标签页组件
│   │   └── toggle-switch.tsx # 开关组件
│   ├── auth/              # 认证组件
│   ├── dashboard/         # 仪表盘组件
│   └── learning/          # 学习组件
│       ├── DefinitionSettingsButton.tsx # 释义设置按钮
│       ├── DefinitionSettingsModal.tsx # 释义设置模态框
│       ├── DefinitionTypeItem.tsx # 释义类型项
│       ├── DefinitionTypeList.tsx # 释义类型列表
│       ├── InitializingProgress.tsx # 初始化进度
│       ├── UIControls.tsx # UI控件
│       ├── WordBubble.tsx # 单词气泡
│       ├── WordDisplay.tsx # 单词显示
│       └── WordSkeleton.tsx # 单词骨架屏
├── hooks/                 # 自定义Hook
│   ├── useAuth.ts         # 认证Hook
│   ├── useDefinitionSettings.ts # 释义设置Hook
│   ├── useLearning.ts     # 学习Hook
│   └── useWordlist.ts     # 词书Hook
├── lib/                   # 工具库
│   ├── auth.ts            # 认证逻辑
│   ├── cacheUtils.ts      # 缓存工具
│   ├── db.ts              # 数据库连接
│   ├── definitionSettings.ts # 释义设置工具
│   ├── dictionary.ts      # 词典爬虫
│   └── utils.ts           # 通用工具函数
├── types/                 # TypeScript类型定义
│   ├── auth.ts            # 认证类型
│   ├── common.ts          # 通用类型
│   ├── definitionSettings.ts # 释义设置类型
│   ├── learning.ts        # 学习类型
│   ├── word.ts            # 单词类型
│   └── wordlist.ts        # 词书类型
└── scripts/               # 脚本文件
    ├── clear-database.ts  # 清空数据库脚本
    ├── data-cleanup-and-repair.ts # 数据清理和修复脚本
    ├── enhanced-data-validator.ts # 增强数据验证器
    ├── enhanced-migrate-word-data.ts # 增强数据迁移脚本
    ├── migration-monitor.ts # 迁移监控脚本
    ├── run-migration.ts   # 运行迁移脚本
    └── test-migration.ts  # 测试迁移脚本
```

## 开发指南

### 添加新功能

1. 在 `src/types/` 中定义相关类型
2. 在 `src/lib/` 中实现业务逻辑
3. 在 `src/app/api/` 中创建 API 路由
4. 在 `src/hooks/` 中创建 Hook
5. 在 `src/components/` 中创建 UI 组件
6. 在相应页面中使用组件

### 数据库迁移

修改 `prisma/schema.prisma` 后，运行：

```bash
npx prisma db push
```

### 数据迁移脚本

项目提供了多个数据迁移和管理脚本：

```bash
# 运行完整迁移流程
npm run migration:full

# 验证迁移数据
npm run migration:validate

# 修复迁移数据
npm run migration:repair

# 清空数据库（谨慎使用）
npm run db:clear

# 重置数据库（清空并重新迁移）
npm run db:reset
```

### 部署

项目已配置为可部署到 Vercel。连接 GitHub 仓库后，Vercel 会自动构建和部署。

### 专注学习模式开发

专注学习模式是项目的核心功能，包含以下组件：

- **物理引擎**: 实现单词卡片的拖拽、碰撞和弹性效果
- **音频系统**: 自动播放单词发音，支持美式和英式发音
- **释义面板**: 可拖拽的释义面板，支持多种释义类型
- **键盘控制**: 支持键盘快捷键操作
- **状态管理**: 统一的学习状态管理

### 词典数据结构

项目使用复杂的数据库结构存储词典数据：

- **Words**: 单词主表，存储基本信息和状态
- **WordPronunciations**: 单词发音表，支持多种发音类型
- **WordDefinitions**: 单词释义表，支持多种释义类型
- **DefinitionExamples**: 释义例句表
- **DefinitionIdioms**: 释义习语表
- **IdiomExamples**: 习语例句表
- **WordSentences**: 单词例句表
- **WordForms**: 词形变换表

## 常见问题

### Q: 如何重置学习进度？

A: 目前暂不支持重置学习进度，但可以创建新词书重新开始学习。

### Q: 词典 API 无法访问怎么办？

A: 可以在设置页面预加载词书缓存，减少对词典 API 的依赖。

### Q: 支持哪些文件格式？

A: 目前支持 `.txt` 和 `.csv` 格式的词书文件。

### Q: 专注学习模式中的单词卡片如何操作？

A: 在专注学习模式中，您可以：

- 拖拽单词卡片到任意位置
- 点击单词卡片查看详细释义
- 使用键盘方向键切换单词
- 按空格键播放单词发音
- 单词卡片碰撞时会产生弹性效果

### Q: 如何自定义释义显示？

A: 在学习界面点击设置按钮，可以：

- 选择显示的释义类型（权威英汉、英汉、英英等）
- 调整释义显示顺序
- 设置字体大小
- 开启/关闭自动播放发音

### Q: 数据库迁移失败怎么办？

A: 可以尝试以下步骤：

1. 运行 `npm run migration:validate` 验证数据
2. 运行 `npm run migration:repair` 修复数据
3. 如仍有问题，可使用 `npm run db:reset` 重置数据库

## 贡献指南

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 更新日志

### v1.0.0 (2025-01-15)

- 初始版本发布
- 实现基本的学习功能
- 添加词书管理功能
- 实现艾宾浩斯复习算法

### v1.1.0 (2025-11-18)

- 升级到 Next.js 15 和 React 19
- 实现专注学习模式，支持拖拽式单词卡片交互
- 添加物理引擎，实现单词卡片碰撞效果
- 实现音频播放系统，支持美式和英式发音
- 完善词典数据结构，支持多种释义类型
- 添加释义自定义设置功能
- 实现测试模式学习功能
- 添加数据迁移和管理脚本
- 优化数据库结构，使用 MySQL 替代 SQLite
- 完善错误处理和加载状态
- 添加键盘快捷键支持
