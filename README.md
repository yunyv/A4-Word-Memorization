# A4 Recite - 专注单词记忆

基于A4纸背单词法的数字化学习工具，采用艾宾浩斯记忆曲线，帮助用户高效记忆单词。

## 功能特点

- 🔐 **令牌认证系统** - 无需注册账户，使用简单令牌即可登录
- 📚 **词书管理** - 上传、管理、删除个人词书
- 🧠 **艾宾浩斯复习算法** - 科学记忆曲线，智能安排复习计划
- 📖 **多种学习模式** - 专注学习、复习、测试三种模式
- 📊 **学习进度跟踪** - 详细的学习统计和进度可视化
- 🗂️ **词典API缓存** - 提高响应速度，减少网络请求
- 📱 **响应式设计** - 适配各种设备屏幕尺寸
- ⚡ **错误处理和加载状态** - 优雅的错误提示和加载动画

## 技术栈

- **前端**: Next.js 14, React, TypeScript, Tailwind CSS
- **后端**: Next.js API Routes
- **数据库**: Prisma, SQLite
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

4. 生成Prisma客户端
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
│   │   ├── auth/          # 认证相关API
│   │   ├── cache/         # 缓存管理API
│   │   ├── dictionary/    # 词典API
│   │   ├── review/        # 复习进度API
│   │   ├── token/         # 令牌验证API
│   │   └── wordlists/     # 词书管理API
│   ├── dashboard/         # 仪表盘页面
│   ├── learning/          # 学习页面
│   ├── settings/          # 设置页面
│   ├── test/              # 测试页面
│   ├── token/             # 令牌页面
│   ├── globals.css        # 全局样式
│   └── layout.tsx         # 根布局
├── components/            # React组件
│   ├── ui/                # UI组件库
│   ├── auth/              # 认证组件
│   ├── dashboard/         # 仪表盘组件
│   └── learning/          # 学习组件
├── hooks/                 # 自定义Hook
│   ├── useAuth.ts         # 认证Hook
│   ├── useLearning.ts     # 学习Hook
│   └── useWordlist.ts     # 词书Hook
├── lib/                   # 工具库
│   ├── auth.ts            # 认证逻辑
│   ├── cacheUtils.ts      # 缓存工具
│   ├── db.ts              # 数据库连接
│   └── dictionary.ts      # 词典爬虫
├── types/                 # TypeScript类型定义
└── prisma/                # Prisma配置
```

## 开发指南

### 添加新功能

1. 在 `src/types/` 中定义相关类型
2. 在 `src/lib/` 中实现业务逻辑
3. 在 `src/app/api/` 中创建API路由
4. 在 `src/hooks/` 中创建Hook
5. 在 `src/components/` 中创建UI组件
6. 在相应页面中使用组件

### 数据库迁移

修改 `prisma/schema.prisma` 后，运行：

```bash
npx prisma db push
```

### 部署

项目已配置为可部署到 Vercel。连接 GitHub 仓库后，Vercel 会自动构建和部署。

## 常见问题

### Q: 如何重置学习进度？

A: 目前暂不支持重置学习进度，但可以创建新词书重新开始学习。

### Q: 词典API无法访问怎么办？

A: 可以在设置页面预加载词书缓存，减少对词典API的依赖。

### Q: 支持哪些文件格式？

A: 目前支持 `.txt` 和 `.csv` 格式的词书文件。

## 贡献指南

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 更新日志

### v1.0.0 (2024-01-15)

- 初始版本发布
- 实现基本的学习功能
- 添加词书管理功能
- 实现艾宾浩斯复习算法
