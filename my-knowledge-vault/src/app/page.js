"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const TYPE_META = {
  note: {
    label: "Notes",
    accent: "bg-emerald-100 text-emerald-800 border-emerald-200",
    tone: "bg-emerald-50 text-emerald-900",
    Icon: NoteIcon,
  },
  document: {
    label: "Documents",
    accent: "bg-sky-100 text-sky-800 border-sky-200",
    tone: "bg-sky-50 text-sky-900",
    Icon: DocumentIcon,
  },
  image: {
    label: "Images",
    accent: "bg-amber-100 text-amber-900 border-amber-200",
    tone: "bg-amber-50 text-amber-950",
    Icon: ImageIcon,
  },
  video: {
    label: "Videos",
    accent: "bg-rose-100 text-rose-800 border-rose-200",
    tone: "bg-rose-50 text-rose-900",
    Icon: VideoIcon,
  },
};

const ITEM_TYPES = Object.keys(TYPE_META);

export default function Home() {
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeType, setActiveType] = useState("all");
  const [activeTag, setActiveTag] = useState("");
  const [taxonomy, setTaxonomy] = useState({ categories: [], tags: [] });
  const [stats, setStats] = useState({
    totalItems: 0,
    categories: 0,
    tags: 0,
    storage: 0,
    score: { correct: 0, total: 0 },
    types: {},
  });
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantReply, setAssistantReply] = useState(
    "Select an item or search the vault to get a focused answer."
  );
  const [quizCursor, setQuizCursor] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [quizFeedback, setQuizFeedback] = useState("");
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState("");
  const [fileKey, setFileKey] = useState(0);
  const [fileMeta, setFileMeta] = useState(null);
  const [draft, setDraft] = useState({
    title: "",
    type: "note",
    category: "Inbox",
    tags: "",
    content: "",
  });

  const titleInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const categories = useMemo(() => {
    return ["All", ...taxonomy.categories];
  }, [taxonomy.categories]);

  const tags = useMemo(() => {
    return taxonomy.tags;
  }, [taxonomy.tags]);

  const filteredItems = items;

  const selectedItem = useMemo(() => {
    return (
      items.find((item) => item.id === selectedId) ||
      filteredItems[0] ||
      items[0]
    );
  }, [filteredItems, items, selectedId]);

  const quizPool = useMemo(() => {
    const sourceItems = filteredItems.length > 0 ? filteredItems : items;
    return sourceItems.map((item) => item.quiz).filter(Boolean);
  }, [filteredItems, items]);

  const currentQuiz = quizPool.length
    ? quizPool[quizCursor % quizPool.length]
    : null;

  const loadItems = useCallback(async (signal) => {
    setIsLoading(true);
    setApiError("");

    const params = new URLSearchParams();
    if (searchTerm.trim()) {
      params.set("search", searchTerm.trim());
    }
    if (activeCategory !== "All") {
      params.set("category", activeCategory);
    }
    if (activeType !== "all") {
      params.set("type", activeType);
    }
    if (activeTag) {
      params.set("tag", activeTag);
    }

    try {
      const response = await fetch(`/api/items?${params.toString()}`, {
        signal,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load vault items.");
      }

      setItems(data.items || []);
      setStats(
        data.stats || {
          totalItems: 0,
          categories: 0,
          tags: 0,
          storage: 0,
          score: { correct: 0, total: 0 },
          types: {},
        }
      );
      setTaxonomy(data.taxonomy || { categories: [], tags: [] });
      setScore(data.stats?.score || { correct: 0, total: 0 });
      setSelectedId((current) => {
        if (data.items?.some((item) => item.id === current)) {
          return current;
        }

        return data.items?.[0]?.id || "";
      });
    } catch (error) {
      if (error.name !== "AbortError") {
        setApiError(error.message || "Unable to load vault items.");
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, [activeCategory, activeTag, activeType, searchTerm]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      loadItems(controller.signal);
    }, searchTerm ? 250 : 0);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [loadItems, searchTerm]);

  function handleFileChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      setFileMeta(null);
      return;
    }

    const type = inferType(file);
    const previewUrl =
      type === "image" || type === "video" ? URL.createObjectURL(file) : "";

    setFileMeta({
      name: file.name,
      size: file.size,
      type,
      previewUrl,
      file,
    });
    setDraft((current) => ({
      ...current,
      title: current.title || cleanFileTitle(file.name),
      type,
    }));
  }

  function handleDraftChange(field, value) {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleAddItem(event) {
    event.preventDefault();
    setIsSaving(true);
    setApiError("");

    const formData = new FormData();
    formData.set("title", draft.title);
    formData.set("type", fileMeta?.type || draft.type);
    formData.set("category", draft.category);
    formData.set("tags", draft.tags);
    formData.set("content", draft.content);

    if (fileMeta?.file) {
      formData.set("file", fileMeta.file);
    }

    try {
      const response = await fetch("/api/items", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to save item.");
      }

      setItems((current) => [data.item, ...current]);
      setStats(data.stats || stats);
      setTaxonomy(data.taxonomy || taxonomy);
      setSelectedId(data.item.id);
      setActiveCategory("All");
      setActiveType("all");
      setActiveTag("");
      setDraft({
        title: "",
        type: "note",
        category: "Inbox",
        tags: "",
        content: "",
      });
      setFileMeta(null);
      setFileKey((key) => key + 1);
    } catch (error) {
      setApiError(error.message || "Unable to save item.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAskAssistant(event) {
    event.preventDefault();
    setAssistantReply("Thinking through the vault...");

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: assistantInput,
          itemId: selectedItem?.id || "",
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to run assistant.");
      }

      setAssistantReply(data.reply);
    } catch (error) {
      setAssistantReply(error.message || "Unable to run assistant.");
    }
  }

  async function handleQuizSubmit(event) {
    event.preventDefault();

    if (!currentQuiz || !selectedAnswer) {
      return;
    }

    try {
      const response = await fetch("/api/quiz/attempts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemId: currentQuiz.itemId,
          selectedAnswer,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to save quiz attempt.");
      }

      setScore(data.score || score);
      setQuizFeedback(data.correct ? "Correct." : `Answer: ${data.answer}.`);
    } catch (error) {
      setQuizFeedback(error.message || "Unable to save quiz attempt.");
    }
  }

  function handleNextQuiz() {
    if (!quizPool.length) {
      return;
    }

    setQuizCursor((cursor) => (cursor + 1) % quizPool.length);
    setSelectedAnswer("");
    setQuizFeedback("");
  }

  async function toggleFavorite(id) {
    const currentItem = items.find((item) => item.id === id);

    if (!currentItem) {
      return;
    }

    const favorite = !currentItem.favorite;

    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, favorite } : item
      )
    );

    try {
      const response = await fetch(`/api/items/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ favorite }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to update favorite.");
      }

      setItems((current) =>
        current.map((item) => (item.id === id ? data.item : item))
      );
      setStats(data.stats || stats);
      setTaxonomy(data.taxonomy || taxonomy);
    } catch (error) {
      setItems((current) =>
        current.map((item) =>
          item.id === id ? { ...item, favorite: currentItem.favorite } : item
        )
      );
      setApiError(error.message || "Unable to update favorite.");
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f5f1] text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-slate-950 text-sm font-semibold text-white">
              MKV
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-normal">
                MyKnowledgeVault
              </h1>
              <p className="text-sm text-slate-500">
                {stats.totalItems} items across {stats.categories} categories
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-2xl">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search vault</span>
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-11 w-full rounded-md border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
                placeholder="Search notes, files, tags"
              />
            </label>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <button
                type="button"
                onClick={() => titleInputRef.current?.focus()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-medium transition hover:bg-slate-50"
              >
                <PlusIcon className="h-4 w-4" />
                New
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                <UploadIcon className="h-4 w-4" />
                Upload
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid min-h-[calc(100vh-73px)] max-w-[1600px] grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_380px]">
        <aside className="border-b border-slate-200 bg-white px-4 py-5 sm:px-6 lg:border-b-0 lg:border-r">
          <div className="space-y-6 lg:sticky lg:top-24">
            <FilterGroup title="Categories">
              {categories.map((category) => (
                <FilterButton
                  key={category}
                  active={activeCategory === category}
                  label={category}
                  count={
                    category === "All"
                      ? items.length
                      : items.filter((item) => item.category === category).length
                  }
                  onClick={() => setActiveCategory(category)}
                />
              ))}
            </FilterGroup>

            <FilterGroup title="Formats">
              <FilterButton
                active={activeType === "all"}
                label="All"
                count={items.length}
                onClick={() => setActiveType("all")}
              />
              {ITEM_TYPES.map((type) => (
                <FilterButton
                  key={type}
                  active={activeType === type}
                  label={TYPE_META[type].label}
                  count={items.filter((item) => item.type === type).length}
                  onClick={() => setActiveType(type)}
                />
              ))}
            </FilterGroup>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-normal text-slate-500">
                  Tags
                </h2>
                {activeTag ? (
                  <button
                    type="button"
                    onClick={() => setActiveTag("")}
                    className="text-xs font-medium text-slate-500 hover:text-slate-900"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setActiveTag(activeTag === tag ? "" : tag)}
                    className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition ${
                      activeTag === tag
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </section>

            <form
              onSubmit={handleAddItem}
              className="space-y-3 border-t border-slate-200 pt-5"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-normal text-slate-500">
                  Capture
                </h2>
                <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-500">
                  local
                </span>
              </div>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">
                  Title
                </span>
                <input
                  ref={titleInputRef}
                  value={draft.title}
                  onChange={(event) =>
                    handleDraftChange("title", event.target.value)
                  }
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
                  placeholder="Knowledge item"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600">
                    Format
                  </span>
                  <select
                    value={draft.type}
                    onChange={(event) =>
                      handleDraftChange("type", event.target.value)
                    }
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-2 text-sm outline-none focus:border-slate-400"
                  >
                    {ITEM_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {TYPE_META[type].label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600">
                    Category
                  </span>
                  <input
                    value={draft.category}
                    onChange={(event) =>
                      handleDraftChange("category", event.target.value)
                    }
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
                    placeholder="Inbox"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">
                  Tags
                </span>
                <input
                  value={draft.tags}
                  onChange={(event) =>
                    handleDraftChange("tags", event.target.value)
                  }
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
                  placeholder="ai, study, backend"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">
                  Body
                </span>
                <textarea
                  value={draft.content}
                  onChange={(event) =>
                    handleDraftChange("content", event.target.value)
                  }
                  className="min-h-24 w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                  placeholder="Paste a note, summary, or file context"
                />
              </label>

              <label className="block rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                <span className="flex items-center gap-2 font-medium text-slate-700">
                  <UploadIcon className="h-4 w-4" />
                  File
                </span>
                <input
                  key={fileKey}
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  className="mt-2 block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-xs file:font-medium file:text-white"
                />
                {fileMeta ? (
                  <span className="mt-2 block break-words text-xs text-slate-500">
                    {fileMeta.name} · {formatBytes(fileMeta.size)}
                  </span>
                ) : null}
              </label>

              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <SaveIcon className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save item"}
              </button>
            </form>
          </div>
        </aside>

        <main className="min-w-0 bg-[#f4f5f1] px-4 py-5 sm:px-6">
          {apiError ? (
            <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
              {apiError}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Items" value={stats.totalItems} />
            <Metric label="Categories" value={stats.categories} />
            <Metric label="Tags" value={stats.tags} />
            <Metric label="Storage" value={formatBytes(stats.storage)} />
          </div>

          <div className="mt-5 flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Vault items</h2>
              <p className="text-sm text-slate-500">
                {isLoading ? "Loading" : `${filteredItems.length} visible`} ·{" "}
                {score.correct}/{score.total} quiz
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {["All", "Study", "Engineering", "Work", "Ideas"].map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`rounded-md border px-3 py-2 text-xs font-medium transition ${
                    activeCategory === category
                      ? "border-slate-950 bg-white text-slate-950 shadow-sm"
                      : "border-transparent bg-transparent text-slate-500 hover:bg-white"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {filteredItems.map((item) => (
              <VaultItem
                key={item.id}
                item={item}
                selected={selectedItem?.id === item.id}
                onClick={() => setSelectedId(item.id)}
              />
            ))}

            {!isLoading && filteredItems.length === 0 ? (
              <div className="col-span-full rounded-md border border-slate-200 bg-white p-8 text-center">
                <SearchIcon className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 text-sm font-medium text-slate-700">
                  No matching vault items
                </p>
              </div>
            ) : null}

            {isLoading ? (
              <div className="col-span-full rounded-md border border-slate-200 bg-white p-8 text-center text-sm font-medium text-slate-500">
                Loading vault items...
              </div>
            ) : null}
          </div>
        </main>

        <aside className="border-t border-slate-200 bg-white px-4 py-5 sm:px-6 lg:border-l lg:border-t-0">
          <div className="space-y-5 lg:sticky lg:top-24">
            {selectedItem ? (
              <section className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">
                      Selected
                    </p>
                    <h2 className="mt-1 break-words text-xl font-semibold">
                      {selectedItem.title}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleFavorite(selectedItem.id)}
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-md border transition ${
                      selectedItem.favorite
                        ? "border-amber-200 bg-amber-100 text-amber-800"
                        : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                    }`}
                    aria-label="Toggle favorite"
                  >
                    <StarIcon className="h-5 w-5" filled={selectedItem.favorite} />
                  </button>
                </div>

                <ItemPreview item={selectedItem} />

                <div className="flex flex-wrap gap-2">
                  <TypeBadge type={selectedItem.type} />
                  <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600">
                    {selectedItem.category}
                  </span>
                  <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600">
                    {formatBytes(selectedItem.size)}
                  </span>
                </div>

                <p className="break-words text-sm leading-6 text-slate-700">
                  {selectedItem.content}
                </p>

                <div className="flex flex-wrap gap-2">
                  {selectedItem.tags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setActiveTag(tag)}
                      className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="border-t border-slate-200 pt-5">
              <div className="mb-3 flex items-center gap-2">
                <SparkIcon className="h-5 w-5 text-slate-700" />
                <h2 className="text-sm font-semibold uppercase tracking-normal text-slate-500">
                  AI Assistant
                </h2>
              </div>
              <form onSubmit={handleAskAssistant} className="space-y-3">
                <textarea
                  value={assistantInput}
                  onChange={(event) => setAssistantInput(event.target.value)}
                  className="min-h-24 w-full resize-y rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:bg-white"
                  placeholder="Ask about notes, tags, summaries, or quizzes"
                />
                <button
                  type="submit"
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <SendIcon className="h-4 w-4" />
                  Ask vault
                </button>
              </form>
              <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                {assistantReply}
              </div>
            </section>

            <section className="border-t border-slate-200 pt-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <QuizIcon className="h-5 w-5 text-slate-700" />
                  <h2 className="text-sm font-semibold uppercase tracking-normal text-slate-500">
                    Quiz
                  </h2>
                </div>
                <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600">
                  {score.correct}/{score.total}
                </span>
              </div>

              {currentQuiz ? (
                <form onSubmit={handleQuizSubmit} className="space-y-3">
                  <p className="text-sm font-medium leading-6 text-slate-800">
                    {currentQuiz.question}
                  </p>
                  <div className="grid gap-2">
                    {currentQuiz.choices.map((choice) => (
                      <label
                        key={choice}
                        className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition ${
                          selectedAnswer === choice
                            ? "border-slate-950 bg-slate-50"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="quiz-answer"
                          value={choice}
                          checked={selectedAnswer === choice}
                          onChange={(event) =>
                            setSelectedAnswer(event.target.value)
                          }
                          className="h-4 w-4 accent-slate-950"
                        />
                        <span className="min-w-0 break-words">{choice}</span>
                      </label>
                    ))}
                  </div>

                  {quizFeedback ? (
                    <p className="rounded-md bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                      {quizFeedback}
                    </p>
                  ) : null}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="submit"
                      disabled={!selectedAnswer}
                      className="inline-flex h-10 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      Check
                    </button>
                    <button
                      type="button"
                      onClick={handleNextQuiz}
                      className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Next
                    </button>
                  </div>
                </form>
              ) : (
                <p className="text-sm text-slate-500">No quiz available.</p>
              )}
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}

function VaultItem({ item, selected, onClick }) {
  const Icon = TYPE_META[item.type]?.Icon || NoteIcon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-0 rounded-md border bg-white p-4 text-left transition hover:border-slate-300 hover:shadow-sm ${
        selected ? "border-slate-950 shadow-sm" : "border-slate-200"
      }`}
    >
      <div className="flex gap-4">
        <div
          className={`grid h-14 w-14 shrink-0 place-items-center rounded-md ${
            TYPE_META[item.type]?.tone || "bg-slate-100 text-slate-900"
          }`}
        >
          <Icon className="h-7 w-7" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <h3 className="break-words text-base font-semibold text-slate-950">
              {item.title}
            </h3>
            {item.favorite ? (
              <StarIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" filled />
            ) : null}
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
            {item.summary}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <TypeBadge type={item.type} />
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
              {item.category}
            </span>
            <span className="text-xs text-slate-400">{formatDate(item.updated)}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

function ItemPreview({ item }) {
  const Icon = TYPE_META[item.type]?.Icon || NoteIcon;

  if ((item.type === "image" || item.type === "video") && item.previewUrl) {
    return (
      <div className="overflow-hidden rounded-md border border-slate-200 bg-slate-100">
        {item.type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.previewUrl}
            alt={item.title}
            className="h-56 w-full object-cover"
          />
        ) : (
          <video
            src={item.previewUrl}
            controls
            className="h-56 w-full bg-slate-950 object-contain"
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-md border border-slate-200 ${
        TYPE_META[item.type]?.tone || "bg-slate-50 text-slate-900"
      }`}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-slate-950/10" />
      <div className="grid min-h-48 place-items-center p-6">
        <div className="text-center">
          <Icon className="mx-auto h-12 w-12" />
          <p className="mt-3 break-words text-sm font-semibold">{item.title}</p>
          <p className="mt-1 text-xs opacity-75">
            {TYPE_META[item.type]?.label || "Item"} · {formatDate(item.updated)}
          </p>
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ title, children }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-normal text-slate-500">
        {title}
      </h2>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function FilterButton({ active, label, count, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-10 w-full items-center justify-between rounded-md px-3 text-sm font-medium transition ${
        active
          ? "bg-slate-950 text-white"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
      }`}
    >
      <span className="truncate">{label}</span>
      <span
        className={`ml-3 rounded px-1.5 py-0.5 text-xs ${
          active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function Metric({ label, value }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-2xl font-semibold text-slate-950">
        {value}
      </p>
    </section>
  );
}

function TypeBadge({ type }) {
  const meta = TYPE_META[type] || TYPE_META.note;

  return (
    <span
      className={`rounded-md border px-2 py-1 text-xs font-medium ${meta.accent}`}
    >
      {meta.label}
    </span>
  );
}

function inferType(file) {
  if (file.type.startsWith("image/")) {
    return "image";
  }

  if (file.type.startsWith("video/")) {
    return "video";
  }

  if (
    file.type.includes("pdf") ||
    file.type.includes("document") ||
    file.type.includes("presentation") ||
    /\.(pdf|doc|docx|ppt|pptx|xls|xlsx)$/i.test(file.name)
  ) {
    return "document";
  }

  return "note";
}

function cleanFileTitle(name) {
  return name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ");
}

function formatBytes(value) {
  if (!value) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1
  );
  const size = value / 1024 ** index;

  return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function SearchIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4.2-4.2" />
    </svg>
  );
}

function PlusIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function UploadIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M20 16v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3" />
    </svg>
  );
}

function SaveIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
      <path d="M17 21v-8H7v8" />
      <path d="M7 3v5h8" />
    </svg>
  );
}

function NoteIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 3h8l4 4v14H4V3h4Z" />
      <path d="M16 3v5h5" />
      <path d="M8 13h8" />
      <path d="M8 17h5" />
    </svg>
  );
}

function DocumentIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
      <path d="M9 9h1" />
    </svg>
  );
}

function ImageIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8" cy="10" r="1.5" />
      <path d="m21 16-5-5L5 19" />
    </svg>
  );
}

function VideoIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="6" width="13" height="12" rx="2" />
      <path d="m16 10 5-3v10l-5-3Z" />
    </svg>
  );
}

function StarIcon({ className = "h-5 w-5", filled = false }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z" />
    </svg>
  );
}

function SparkIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3 1.7 5.1L19 10l-5.3 1.9L12 17l-1.7-5.1L5 10l5.3-1.9Z" />
      <path d="M19 16v4" />
      <path d="M17 18h4" />
    </svg>
  );
}

function SendIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

function QuizIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 11a3 3 0 1 1 4.6 2.5c-.9.5-1.6 1.1-1.6 2.5" />
      <path d="M12 20h.01" />
      <rect x="4" y="3" width="16" height="18" rx="2" />
    </svg>
  );
}
