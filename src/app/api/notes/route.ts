import * as repo from "@/lib/repo";
import { authUser, handleError, ok, readJson } from "@/lib/api";
import { noteSchema } from "@/lib/validation";

export async function GET() {
  try {
    const user = await authUser();
    return ok({ notes: repo.listNotes(user.id) });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await authUser();
    const body = await readJson(request);
    const data = noteSchema.parse(body);
    const note = repo.createNote(user.id, {
      title: data.title,
      body: data.body ?? "",
      color: data.color ?? "amber",
      pinned: data.pinned ?? false,
      tags: data.tags ?? null,
    });
    return ok({ note }, 201);
  } catch (error) {
    return handleError(error);
  }
}
