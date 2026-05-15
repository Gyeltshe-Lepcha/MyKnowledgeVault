import { runAssistant } from "@/lib/vaultRepository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const input = await request.json();
    const reply = await runAssistant({
      query: input.query || "",
      itemId: input.itemId || "",
    });

    return Response.json({ reply });
  } catch (error) {
    return Response.json(
      { error: error.message || "Unable to run assistant." },
      { status: 400 }
    );
  }
}
