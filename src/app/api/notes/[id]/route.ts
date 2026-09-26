import * as repo from "@/lib/repo";
import { ApiError, authUser, handleError, ok, readJson } from "@/lib/api";
import { noteUpdateSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const user = await authUser();
    const { id } = await params;
    const body = await readJson(request);
    const data = noteUpdateSchema.parse(body);

    const existing = repo.findNote(user.id, id);
    if (!existing) throw new ApiError("নোট খুঁজে পাওয়া যায়নি", 404);

    const note = repo.updateNote(user.id, id, data);
    return ok({ note });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    const user = await authUser();
    const { id } = await params;
    const existing = repo.findNote(user.id, id);
    if (!existing) throw new ApiError("নোট খুঁজে পাওয়া যায়নি", 404);
    repo.deleteNote(user.id, id);
    return ok({ success: true });
  } catch (error) {
    return handleError(error);
  }
}
