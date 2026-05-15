import {
  deleteItem,
  getDashboardStats,
  getTaxonomy,
  updateItem,
  serializeItem,
} from "@/lib/vaultRepository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request, context) {
  try {
    const { id } = await context.params;
    const input = await request.json();
    const item = await updateItem(id, input);
    const [stats, taxonomy] = await Promise.all([
      getDashboardStats(),
      getTaxonomy(),
    ]);

    return Response.json({
      item: serializeItem(item),
      stats,
      taxonomy,
    });
  } catch (error) {
    return Response.json(
      { error: error.message || "Unable to update vault item." },
      { status: 400 }
    );
  }
}

export async function DELETE(_request, context) {
  try {
    const { id } = await context.params;

    await deleteItem(id);

    const [stats, taxonomy] = await Promise.all([
      getDashboardStats(),
      getTaxonomy(),
    ]);

    return Response.json({
      ok: true,
      stats,
      taxonomy,
    });
  } catch (error) {
    return Response.json(
      { error: error.message || "Unable to delete vault item." },
      { status: 400 }
    );
  }
}
