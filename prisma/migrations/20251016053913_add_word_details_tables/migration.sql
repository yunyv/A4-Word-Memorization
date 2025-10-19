-- AlterTable
ALTER TABLE `words` ADD COLUMN `pronunciation` VARCHAR(200) NULL,
    MODIFY `definition_data` JSON NULL;

-- CreateTable
CREATE TABLE `WordPronunciations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `word_id` INTEGER NOT NULL,
    `type` VARCHAR(20) NOT NULL,
    `phonetic` VARCHAR(100) NOT NULL,
    `audio_url` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `WordPronunciations_word_id_type_key`(`word_id`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WordDefinitions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `word_id` INTEGER NOT NULL,
    `type` VARCHAR(30) NOT NULL,
    `part_of_speech` VARCHAR(50) NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `meaning` TEXT NULL,
    `chinese_meaning` TEXT NULL,
    `english_meaning` TEXT NULL,
    `definition_number` INTEGER NULL,
    `linked_words` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `WordDefinitions_word_id_type_idx`(`word_id`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DefinitionExamples` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `definition_id` INTEGER NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `english` TEXT NOT NULL,
    `chinese` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DefinitionExamples_definition_id_idx`(`definition_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DefinitionIdioms` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `definition_id` INTEGER NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `title` VARCHAR(200) NOT NULL,
    `meaning` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DefinitionIdioms_definition_id_idx`(`definition_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IdiomExamples` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idiom_id` INTEGER NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `english` TEXT NOT NULL,
    `chinese` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `IdiomExamples_idiom_id_idx`(`idiom_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WordSentences` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `word_id` INTEGER NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `english` TEXT NOT NULL,
    `chinese` TEXT NULL,
    `audio_url` TEXT NULL,
    `source` VARCHAR(200) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `WordSentences_word_id_idx`(`word_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WordForms` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `word_id` INTEGER NOT NULL,
    `form_type` VARCHAR(50) NOT NULL,
    `form_word` VARCHAR(100) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `WordForms_word_id_form_type_key`(`word_id`, `form_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `WordPronunciations` ADD CONSTRAINT `WordPronunciations_word_id_fkey` FOREIGN KEY (`word_id`) REFERENCES `Words`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WordDefinitions` ADD CONSTRAINT `WordDefinitions_word_id_fkey` FOREIGN KEY (`word_id`) REFERENCES `Words`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DefinitionExamples` ADD CONSTRAINT `DefinitionExamples_definition_id_fkey` FOREIGN KEY (`definition_id`) REFERENCES `WordDefinitions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DefinitionIdioms` ADD CONSTRAINT `DefinitionIdioms_definition_id_fkey` FOREIGN KEY (`definition_id`) REFERENCES `WordDefinitions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IdiomExamples` ADD CONSTRAINT `IdiomExamples_idiom_id_fkey` FOREIGN KEY (`idiom_id`) REFERENCES `DefinitionIdioms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WordSentences` ADD CONSTRAINT `WordSentences_word_id_fkey` FOREIGN KEY (`word_id`) REFERENCES `Words`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WordForms` ADD CONSTRAINT `WordForms_word_id_fkey` FOREIGN KEY (`word_id`) REFERENCES `Words`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
