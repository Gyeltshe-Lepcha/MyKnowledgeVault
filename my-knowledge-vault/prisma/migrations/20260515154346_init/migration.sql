-- CreateTable
CREATE TABLE "VaultItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sourceName" TEXT,
    "fileUrl" TEXT,
    "mimeType" TEXT,
    "size" INTEGER NOT NULL DEFAULT 0,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "VaultItemTag" (
    "itemId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    PRIMARY KEY ("itemId", "tagId"),
    CONSTRAINT "VaultItemTag_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "VaultItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VaultItemTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuizQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "choices" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    CONSTRAINT "QuizQuestion_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "VaultItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuizAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT,
    "questionId" TEXT,
    "selectedAnswer" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuizAttempt_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "VaultItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "QuizAttempt_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QuizQuestion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssistantRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "query" TEXT NOT NULL,
    "reply" TEXT NOT NULL,
    "itemId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "VaultItem_category_idx" ON "VaultItem"("category");

-- CreateIndex
CREATE INDEX "VaultItem_type_idx" ON "VaultItem"("type");

-- CreateIndex
CREATE INDEX "VaultItem_favorite_idx" ON "VaultItem"("favorite");

-- CreateIndex
CREATE INDEX "VaultItem_updatedAt_idx" ON "VaultItem"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "VaultItemTag_tagId_idx" ON "VaultItemTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "QuizQuestion_itemId_key" ON "QuizQuestion"("itemId");

-- CreateIndex
CREATE INDEX "QuizAttempt_createdAt_idx" ON "QuizAttempt"("createdAt");

-- CreateIndex
CREATE INDEX "QuizAttempt_itemId_idx" ON "QuizAttempt"("itemId");

-- CreateIndex
CREATE INDEX "QuizAttempt_questionId_idx" ON "QuizAttempt"("questionId");

-- CreateIndex
CREATE INDEX "AssistantRun_createdAt_idx" ON "AssistantRun"("createdAt");
