import { createQuizAttempt, getQuizScore } from "@/lib/vaultRepository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json({
      score: await getQuizScore(),
    });
  } catch (error) {
    return Response.json(
      { error: error.message || "Unable to load quiz score." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const input = await request.json();
    const result = await createQuizAttempt({
      itemId: input.itemId,
      selectedAnswer: input.selectedAnswer,
    });

    if (!result) {
      return Response.json({ error: "Quiz question not found." }, { status: 404 });
    }

    return Response.json(result, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error.message || "Unable to save quiz attempt." },
      { status: 400 }
    );
  }
}
