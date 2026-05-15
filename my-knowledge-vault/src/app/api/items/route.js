import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import {
  createItem,
  getDashboardStats,
  getTaxonomy,
  listItems,
  normalizeTags,
  normalizeType,
  serializeItem,
} from "@/lib/vaultRepository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const items = await listItems({
      search: searchParams.get("search") || "",
      category: searchParams.get("category") || "All",
      type: searchParams.get("type") || "all",
      tag: searchParams.get("tag") || "",
    });
    const [stats, taxonomy] = await Promise.all([
      getDashboardStats(),
      getTaxonomy(),
    ]);

    return Response.json({
      items: items.map(serializeItem),
      stats,
      taxonomy,
    });
  } catch (error) {
    return Response.json(
      { error: error.message || "Unable to load vault items." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    const input = contentType.includes("multipart/form-data")
      ? await readFormData(request)
      : await request.json();

    const item = await createItem({
      title: input.title,
      type: normalizeType(input.type),
      category: input.category,
      tags: normalizeTags(input.tags),
      content: input.content,
      sourceName: input.sourceName,
      fileUrl: input.fileUrl,
      mimeType: input.mimeType,
      size: input.size,
    });

    const [stats, taxonomy] = await Promise.all([
      getDashboardStats(),
      getTaxonomy(),
    ]);

    return Response.json(
      {
        item: serializeItem(item),
        stats,
        taxonomy,
      },
      { status: 201 }
    );
  } catch (error) {
    return Response.json(
      { error: error.message || "Unable to create vault item." },
      { status: 400 }
    );
  }
}

async function readFormData(request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const input = {
    title: String(formData.get("title") || ""),
    type: String(formData.get("type") || "note"),
    category: String(formData.get("category") || "Inbox"),
    tags: String(formData.get("tags") || ""),
    content: String(formData.get("content") || ""),
  };

  if (file && typeof file.arrayBuffer === "function" && file.size > 0) {
    const upload = await saveUpload(file);
    Object.assign(input, upload);
  }

  return input;
}

async function saveUpload(file) {
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  const safeName = file.name
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  const extension = path.extname(file.name).toLowerCase();
  const filename = `${randomUUID()}-${safeName || "upload"}${extension}`;
  const filepath = path.join(uploadsDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());

  await mkdir(uploadsDir, { recursive: true });
  await writeFile(filepath, buffer);

  return {
    sourceName: file.name,
    fileUrl: `/uploads/${filename}`,
    mimeType: file.type || null,
    size: file.size,
  };
}
