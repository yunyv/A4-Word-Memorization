# 新的 Prisma Schema 文件内容

这是更新后的 `prisma/schema.prisma` 文件内容，添加了新的表结构来优化单词数据存储。

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

// Looking for ways to speed up your queries, or scale easily with your serverless or edge functions?
// Try Prisma Accelerate: https://pris.ly/cli/accelerate-init

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// 用户表：存储用户的核心标识
model User {
  id        Int      @id @default(autoincrement())
  token     String   @unique @db.VarChar(64)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @default(now()) @updatedAt @map("updated_at")

  // 关联关系
  wordlists         Wordlist[]
  userWordProgress  UserWordProgress[]

  @@map("Users")
}

// 词书表：存储用户上传的词书信息
model Wordlist {
  id        Int      @id @default(autoincrement())
  userId    Int      @map("user_id")
  name      String   @db.VarChar(100)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @default(now()) @updatedAt @map("updated_at")

  // 关联关系
  user            User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  wordlistEntries WordlistEntry[]

  @@map("Wordlists")
}

// 单词表：全局单词缓存表
model Word {
  id              Int      @id @default(autoincrement())
  wordText        String   @unique @map("word_text") @db.VarChar(100)
  
  // 基本信息字段
  pronunciation   String?  @map("pronunciation") @db.VarChar(200)
  
  // 保留原有JSON字段作为备份
  definitionData  Json?    @map("definition_data")
  
  // 时间戳
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @default(now()) @updatedAt @map("updated_at")

  // 关联关系
  pronunciations   WordPronunciation[]
  definitions      WordDefinition[]
  sentences        WordSentence[]
  wordForms        WordForm[]
  wordlistEntries  WordlistEntry[]
  userWordProgress UserWordProgress[]

  @@map("Words")
}

// 单词发音表
model WordPronunciation {
  id        Int      @id @default(autoincrement())
  wordId    Int      @map("word_id")
  type      String   @db.VarChar(20) // 'american' | 'british'
  phonetic  String   @db.VarChar(100)
  audioUrl  String?  @map("audio_url") @db.Text
  
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @default(now()) @updatedAt @map("updated_at")

  // 关联关系
  word Word @relation(fields: [wordId], references: [id], onDelete: Cascade)

  @@unique([wordId, type])
  @@map("WordPronunciations")
}

// 单词释义表
model WordDefinition {
  id          Int      @id @default(autoincrement())
  wordId      Int      @map("word_id")
  type        String   @db.VarChar(30) // 'basic' | 'web' | 'authoritative' | 'bilingual' | 'english'
  partOfSpeech String? @map("part_of_speech") @db.VarChar(50)
  order       Int      @default(0) // 释义顺序
  
  // 基本释义和网络释义使用
  meaning     String?  @db.Text
  
  // 权威英汉释义使用
  chineseMeaning  String? @map("chinese_meaning") @db.Text
  englishMeaning  String? @map("english_meaning") @db.Text
  definitionNumber Int?   @map("definition_number")
  
  // 英英释义使用
  linkedWords String? @map("linked_words") @db.Text // JSON array of linked words
  
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @default(now()) @updatedAt @map("updated_at")

  // 关联关系
  word       Word       @relation(fields: [wordId], references: [id], onDelete: Cascade)
  examples   DefinitionExample[]
  idioms     DefinitionIdiom[]

  @@index([wordId, type])
  @@map("WordDefinitions")
}

// 释义例句表
model DefinitionExample {
  id            Int      @id @default(autoincrement())
  definitionId  Int      @map("definition_id")
  order         Int      @default(0) // 例句顺序
  english       String   @db.Text
  chinese       String?  @db.Text
  
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @default(now()) @updatedAt @map("updated_at")

  // 关联关系
  definition WordDefinition @relation(fields: [definitionId], references: [id], onDelete: Cascade)

  @@index([definitionId])
  @@map("DefinitionExamples")
}

// 释义习语表
model DefinitionIdiom {
  id            Int      @id @default(autoincrement())
  definitionId  Int      @map("definition_id")
  order         Int      @default(0) // 习语顺序
  title         String   @db.VarChar(200)
  meaning       String   @db.Text
  
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @default(now()) @updatedAt @map("updated_at")

  // 关联关系
  definition WordDefinition @relation(fields: [definitionId], references: [id], onDelete: Cascade)
  examples   IdiomExample[]

  @@index([definitionId])
  @@map("DefinitionIdioms")
}

// 习语例句表
model IdiomExample {
  id         Int      @id @default(autoincrement())
  idiomId    Int      @map("idiom_id")
  order      Int      @default(0) // 例句顺序
  english    String   @db.Text
  chinese    String?  @db.Text
  
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @default(now()) @updatedAt @map("updated_at")

  // 关联关系
  idiom DefinitionIdiom @relation(fields: [idiomId], references: [id], onDelete: Cascade)

  @@index([idiomId])
  @@map("IdiomExamples")
}

// 单词例句表
model WordSentence {
  id         Int      @id @default(autoincrement())
  wordId     Int      @map("word_id")
  order      Int      @default(0) // 例句顺序
  english    String   @db.Text
  chinese    String?  @db.Text
  audioUrl   String?  @map("audio_url") @db.Text
  source     String?  @db.VarChar(200) // 例句来源
  
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @default(now()) @updatedAt @map("updated_at")

  // 关联关系
  word Word @relation(fields: [wordId], references: [id], onDelete: Cascade)

  @@index([wordId])
  @@map("WordSentences")
}

// 词形变换表
model WordForm {
  id        Int      @id @default(autoincrement())
  wordId    Int      @map("word_id")
  formType  String   @map("form_type") @db.VarChar(50) // 'plural', 'past_tense', etc.
  formWord  String   @map("form_word") @db.VarChar(100)
  
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @default(now()) @updatedAt @map("updated_at")

  // 关联关系
  word Word @relation(fields: [wordId], references: [id], onDelete: Cascade)

  @@unique([wordId, formType])
  @@map("WordForms")
}

// 词书条目表：词书和单词的多对多关联
model WordlistEntry {
  id         Int @id @default(autoincrement())
  wordlistId Int @map("wordlist_id")
  wordId     Int @map("word_id")

  // 关联关系
  wordlist Wordlist @relation(fields: [wordlistId], references: [id], onDelete: Cascade)
  word     Word     @relation(fields: [wordId], references: [id], onDelete: Cascade)

  @@unique([wordlistId, wordId])
  @@map("WordlistEntries")
}

// 用户单词进度表：跟踪每个用户对每个单词的学习进度
model UserWordProgress {
  id              Int      @id @default(autoincrement())
  userId          Int      @map("user_id")
  wordId          Int      @map("word_id")
  reviewStage     Int      @default(0) @map("review_stage")
  nextReviewDate  DateTime @map("next_review_date") @db.Date
  lastReviewedAt  DateTime? @map("last_reviewed_at")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @default(now()) @updatedAt @map("updated_at")

  // 关联关系
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  word Word @relation(fields: [wordId], references: [id], onDelete: Cascade)

  @@unique([userId, wordId])
  @@map("UserWordProgress")
}
```

## 主要变更说明

1. **Words 表更新**：
   - 添加了 `pronunciation` 字段存储基本发音信息
   - 保留了 `definitionData` JSON 字段作为备份

2. **新增表结构**：
   - `WordPronunciations`：存储美式和英式发音及音频
   - `WordDefinitions`：存储各种类型的释义
   - `DefinitionExamples`：存储释义中的例句
   - `DefinitionIdioms`：存储释义中的习语
   - `IdiomExamples`：存储习语中的例句
   - `WordSentences`：存储独立的例句
   - `WordForms`：存储词形变化

3. **索引优化**：
   - 为常用查询字段添加了索引
   - 为复合查询添加了复合索引

## 下一步操作

1. 将此内容替换到 `prisma/schema.prisma` 文件
2. 运行 `prisma migrate dev` 创建迁移文件
3. 运行 `prisma generate` 更新 Prisma 客户端
4. 创建数据迁移脚本，将现有 JSON 数据迁移到新表结构