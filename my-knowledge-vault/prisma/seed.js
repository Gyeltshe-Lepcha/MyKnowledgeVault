const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

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

async function main() {
  for (const item of sampleItems) {
    const updatedAt = new Date(`${item.updated}T12:00:00.000Z`);

    await prisma.vaultItem.upsert({
      where: { id: item.id },
      create: {
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
      update: {
        title: item.title,
        type: item.type,
        category: item.category,
        summary: item.summary,
        content: item.content,
        size: item.size,
        favorite: item.favorite,
        updatedAt,
        tags: {
          deleteMany: {},
          create: tagCreateInput(item.tags),
        },
        quiz: {
          upsert: {
            create: {
              question: item.quiz.question,
              choices: JSON.stringify(item.quiz.choices),
              answer: item.quiz.answer,
            },
            update: {
              question: item.quiz.question,
              choices: JSON.stringify(item.quiz.choices),
              answer: item.quiz.answer,
            },
          },
        },
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
