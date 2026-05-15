import { prisma } from "@/lib/prisma";

const VALID_TYPES = new Set(["note", "document", "image", "video"]);

const itemInclude = {
  tags: {
    include: {
      tag: true,
    },
    orderBy: {
      tag: {
        name: "asc",
      },
    },
  },
  quiz: true,
};

const sampleItems = [
  {
    id: "item-research-methods",
    title: "Research methods notebook",
    type: "note",
    category: "Study",
    tags: ["research", "writing", "statistics"],
    updated: "2026-05-09",
    size: 18000,
    favorite: true,
    summary:
      "Interview protocols, sampling notes, and a short checklist for validating qualitative findings.",
    content:
      "Use a mixed-methods flow: define the research question, run five exploratory interviews, code themes, then validate with a focused survey. Keep raw observations separate from interpretation.",
    quiz: {
      question: "What should stay separate from interpretation?",
      choices: ["Raw observations", "Final citations", "Storage names"],
      answer: "Raw observations",
    },
  },
  {
    id: "item-indexing",
    title: "PostgreSQL indexing notes",
    type: "note",
    category: "Engineering",
    tags: ["database", "performance", "backend"],
    updated: "2026-05-11",
    size: 24000,
    favorite: false,
    summary:
      "Index selection notes for lookup-heavy tables, composite keys, and query plan review.",
    content:
      "Start with the most selective predicates, keep composite indexes aligned with common WHERE and ORDER BY clauses, and inspect EXPLAIN ANALYZE before adding more indexes.",
    quiz: {
      question: "Which command should be checked before adding more indexes?",
      choices: ["EXPLAIN ANALYZE", "npm run dev", "VACUUM FULL"],
      answer: "EXPLAIN ANALYZE",
    },
  },
  {
    id: "item-planning-deck",
    title: "Quarterly planning deck",
    type: "document",
    category: "Work",
    tags: ["planning", "strategy", "pdf"],
    updated: "2026-05-03",
    size: 4200000,
    favorite: false,
    summary:
      "Roadmap priorities, owner assignments, budget notes, and delivery risk register.",
    content:
      "The plan prioritizes customer onboarding, search reliability, and billing cleanup. Open risks include data migration timing and final API cost estimates.",
    quiz: {
      question: "Which priority is included in the quarterly deck?",
      choices: ["Customer onboarding", "Logo redesign", "Office catering"],
      answer: "Customer onboarding",
    },
  },
  {
    id: "item-system-clips",
    title: "System design clips",
    type: "video",
    category: "Engineering",
    tags: ["architecture", "video", "scalability"],
    updated: "2026-05-06",
    size: 156000000,
    favorite: true,
    summary:
      "Short lessons on queues, caching layers, partitioning, and API boundary design.",
    content:
      "The recurring theme is to isolate failure domains, keep hot paths observable, and use queues where user-facing latency does not need immediate completion.",
    quiz: {
      question: "Where can queues help most?",
      choices: ["Non-immediate work", "Password display", "Static labels"],
      answer: "Non-immediate work",
    },
  },
  {
    id: "item-whiteboard",
    title: "Whiteboard snapshot",
    type: "image",
    category: "Ideas",
    tags: ["diagram", "product", "brainstorm"],
    updated: "2026-05-12",
    size: 980000,
    favorite: false,
    summary:
      "A product map connecting inbox capture, vault organization, assistant review, and quizzes.",
    content:
      "The strongest path starts with quick capture, then tag cleanup, then quiz generation from selected notes.",
    quiz: {
      question: "What is the first step in the product map?",
      choices: ["Quick capture", "Annual billing", "Theme selection"],
      answer: "Quick capture",
    },
  },
  {
    id: "item-language",
    title: "Language practice set",
    type: "document",
    category: "Study",
    tags: ["language", "flashcards", "quiz"],
    updated: "2026-05-01",
    size: 760000,
    favorite: false,
    summary:
      "Vocabulary groups, example sentences, and spaced repetition prompts.",
    content:
      "Group vocabulary by context, not alphabetically. Add one sentence per phrase and review weak groups twice before moving to new material.",
    quiz: {
      question: "How should vocabulary be grouped?",
      choices: ["By context", "Alphabetically only", "By file size"],
      answer: "By context",
    },
  },
];

let seedPromise;

export async function ensureSeedData() {
  if (!seedPromise) {
    seedPromise = seedIfEmpty();
  }

  return seedPromise;
}

export async function listItems(filters = {}) {
  await ensureSeedData();

  return prisma.vaultItem.findMany({
    where: buildWhere(filters),
    include: itemInclude,
    orderBy: [{ favorite: "desc" }, { updatedAt: "desc" }],
  });
}

export async function getItem(id) {
  if (!id) {
    return null;
  }

  await ensureSeedData();

  return prisma.vaultItem.findUnique({
    where: { id },
    include: itemInclude,
  });
}

export async function getDashboardStats() {
  await ensureSeedData();

  const [items, tags, attempts] = await Promise.all([
    prisma.vaultItem.findMany({
      select: {
        category: true,
        size: true,
        type: true,
      },
    }),
    prisma.tag.count(),
    prisma.quizAttempt.findMany({
      select: {
        correct: true,
      },
    }),
  ]);

  return {
    totalItems: items.length,
    categories: new Set(items.map((item) => item.category)).size,
    tags,
    storage: items.reduce((total, item) => total + item.size, 0),
    score: {
      correct: attempts.filter((attempt) => attempt.correct).length,
      total: attempts.length,
    },
    types: Object.fromEntries(
      ["note", "document", "image", "video"].map((type) => [
        type,
        items.filter((item) => item.type === type).length,
      ])
    ),
  };
}

export async function getTaxonomy() {
  await ensureSeedData();

  const [items, tags] = await Promise.all([
    prisma.vaultItem.findMany({
      select: {
        category: true,
      },
    }),
    prisma.tag.findMany({
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  return {
    categories: Array.from(new Set(items.map((item) => item.category))).sort(
      (a, b) => a.localeCompare(b)
    ),
    tags: tags.map((tag) => tag.name),
  };
}

export async function createItem(input) {
  await ensureSeedData();

  const category = input.category?.trim() || "Inbox";
  const type = normalizeType(input.type);
  const content =
    input.content?.trim() ||
    (input.sourceName
      ? `${input.sourceName} was added to ${category}.`
      : "Captured note without body text.");
  const title = input.title?.trim() || input.sourceName || "Untitled item";
  const tags = normalizeTags(input.tags);
  const summary = input.summary?.trim() || summarizeContent(content);
  const choices = makeUniqueChoices(category, await getCategoryNames());

  return prisma.vaultItem.create({
    data: {
      title,
      type,
      category,
      summary,
      content,
      size: input.size || Math.max(content.length * 18, 1200),
      sourceName: input.sourceName || null,
      fileUrl: input.fileUrl || null,
      mimeType: input.mimeType || null,
      tags: {
        create: tagCreateInput(tags.length ? tags : ["inbox"]),
      },
      quiz: {
        create: {
          question: `Which category is "${title}" saved under?`,
          choices: JSON.stringify(choices),
          answer: category,
        },
      },
    },
    include: itemInclude,
  });
}

export async function updateItem(id, input) {
  const data = {};

  if (typeof input.favorite === "boolean") {
    data.favorite = input.favorite;
  }

  if (typeof input.title === "string") {
    data.title = input.title.trim() || "Untitled item";
  }

  if (typeof input.category === "string") {
    data.category = input.category.trim() || "Inbox";
  }

  if (typeof input.type === "string") {
    data.type = normalizeType(input.type);
  }

  if (typeof input.content === "string") {
    data.content = input.content;
    data.summary = summarizeContent(input.content);
  }

  if (Array.isArray(input.tags) || typeof input.tags === "string") {
    const tags = normalizeTags(input.tags);
    data.tags = {
      deleteMany: {},
      create: tagCreateInput(tags.length ? tags : ["inbox"]),
    };
  }

  return prisma.vaultItem.update({
    where: { id },
    data,
    include: itemInclude,
  });
}

export async function deleteItem(id) {
  return prisma.vaultItem.delete({
    where: { id },
  });
}

export async function createQuizAttempt(input) {
  await ensureSeedData();

  const item = await getItem(input.itemId);

  if (!item?.quiz) {
    return null;
  }

  const correct = input.selectedAnswer === item.quiz.answer;

  await prisma.quizAttempt.create({
    data: {
      itemId: item.id,
      questionId: item.quiz.id,
      selectedAnswer: input.selectedAnswer || "",
      correct,
    },
  });

  return {
    correct,
    answer: item.quiz.answer,
    score: await getQuizScore(),
  };
}

export async function getQuizScore() {
  const attempts = await prisma.quizAttempt.findMany({
    select: {
      correct: true,
    },
  });

  return {
    correct: attempts.filter((attempt) => attempt.correct).length,
    total: attempts.length,
  };
}

export async function runAssistant({ query, itemId }) {
  await ensureSeedData();

  const focusItem = await getItem(itemId);
  const cleanQuery = query?.trim() || "";
  const lowerQuery = cleanQuery.toLowerCase();
  let reply;

  if (!cleanQuery && focusItem) {
    reply = `${focusItem.title}: ${focusItem.summary} Tags: ${formatTags(
      focusItem
    )}.`;
  } else if (lowerQuery.includes("tag") && focusItem) {
    const suggested = Array.from(
      new Set([
        ...getItemTags(focusItem),
        ...focusItem.title
          .toLowerCase()
          .split(/\W+/)
          .filter((word) => word.length > 4)
          .slice(0, 3),
      ])
    );
    reply = `Suggested tags for ${focusItem.title}: ${suggested.join(", ")}.`;
  } else if (
    (lowerQuery.includes("quiz") || lowerQuery.includes("test")) &&
    focusItem?.quiz
  ) {
    reply = `${focusItem.quiz.question} Answer: ${focusItem.quiz.answer}.`;
  } else if (
    (lowerQuery.includes("summary") || lowerQuery.includes("summarize")) &&
    focusItem
  ) {
    reply = `${focusItem.title}: ${focusItem.summary}`;
  } else {
    const matches = await listItems({ search: lowerQuery });
    reply = matches.length
      ? matches
          .slice(0, 3)
          .map((item) => `${item.title}: ${item.summary}`)
          .join(" ")
      : "No matching vault item found.";
  }

  await prisma.assistantRun.create({
    data: {
      query: cleanQuery,
      reply,
      itemId: focusItem?.id || null,
    },
  });

  return reply;
}

export function serializeItem(item) {
  return {
    id: item.id,
    title: item.title,
    type: item.type,
    category: item.category,
    tags: getItemTags(item),
    updated: item.updatedAt.toISOString().slice(0, 10),
    size: item.size,
    favorite: item.favorite,
    summary: item.summary,
    content: item.content,
    previewUrl: item.fileUrl || "",
    sourceName: item.sourceName || "",
    mimeType: item.mimeType || "",
    quiz: item.quiz
      ? {
          id: item.quiz.id,
          itemId: item.id,
          question: item.quiz.question,
          choices: parseChoices(item.quiz.choices),
          answer: item.quiz.answer,
        }
      : makeFallbackQuiz(item),
  };
}

export function normalizeTags(value) {
  if (Array.isArray(value)) {
    return value
      .map((tag) => String(tag).trim().toLowerCase())
      .filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
}

export function summarizeContent(value) {
  const normalized = String(value || "")
    .replace(/\s+/g, " ")
    .trim();

  if (normalized.length <= 150) {
    return normalized || "Captured knowledge item.";
  }

  return `${normalized.slice(0, 147)}...`;
}

export function normalizeType(type) {
  return VALID_TYPES.has(type) ? type : "note";
}

async function seedIfEmpty() {
  const count = await prisma.vaultItem.count();

  if (count > 0) {
    return;
  }

  for (const item of sampleItems) {
    const updatedAt = new Date(`${item.updated}T12:00:00.000Z`);

    await prisma.vaultItem.create({
      data: {
        id: item.id,
        title: item.title,
        type: item.type,
        category: item.category,
        summary: item.summary,
        content: item.content,
        size: item.size,
        favorite: item.favorite,
        createdAt: updatedAt,
        updatedAt,
        tags: {
          create: tagCreateInput(item.tags),
        },
        quiz: {
          create: {
            question: item.quiz.question,
            choices: JSON.stringify(item.quiz.choices),
            answer: item.quiz.answer,
          },
        },
      },
    });
  }
}

function buildWhere(filters) {
  const where = {};
  const search = filters.search?.trim();

  if (filters.category && filters.category !== "All") {
    where.category = filters.category;
  }

  if (filters.type && filters.type !== "all") {
    where.type = normalizeType(filters.type);
  }

  if (filters.tag) {
    where.tags = {
      some: {
        tag: {
          name: filters.tag,
        },
      },
    };
  }

  if (search) {
    where.OR = [
      { title: { contains: search } },
      { category: { contains: search } },
      { summary: { contains: search } },
      { content: { contains: search } },
      {
        tags: {
          some: {
            tag: {
              name: { contains: search },
            },
          },
        },
      },
    ];
  }

  return where;
}

function tagCreateInput(tags) {
  return tags.map((name) => ({
    tag: {
      connectOrCreate: {
        where: { name },
        create: { name },
      },
    },
  }));
}

async function getCategoryNames() {
  const items = await prisma.vaultItem.findMany({
    select: {
      category: true,
    },
  });

  return Array.from(new Set(items.map((item) => item.category)));
}

function makeFallbackQuiz(item) {
  return {
    itemId: item.id,
    question: `Which category is "${item.title}" saved under?`,
    choices: makeUniqueChoices(item.category, [
      "Study",
      "Engineering",
      "Work",
      "Ideas",
    ]),
    answer: item.category,
  };
}

function makeUniqueChoices(answer, options) {
  const choices = [answer, ...options.filter((option) => option !== answer)];
  const uniqueChoices = Array.from(new Set(choices)).slice(0, 3);

  while (uniqueChoices.length < 3) {
    uniqueChoices.push(`Option ${uniqueChoices.length + 1}`);
  }

  return uniqueChoices;
}

function getItemTags(item) {
  return item.tags.map(({ tag }) => tag.name);
}

function formatTags(item) {
  return getItemTags(item).join(", ");
}

function parseChoices(value) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
