import * as repo from "@/lib/repo";
import { ApiError, authUser, handleError, ok, readJson } from "@/lib/api";
import { expenseUpdateSchema } from "@/lib/validation";
import { logActivity } from "@/lib/services";
import { parseDateInput } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const user = await authUser();
    const { id } = await params;
    const body = await readJson(request);
    const data = expenseUpdateSchema.parse(body);

    const existing = repo.findExpense(user.id, id);
    if (!existing) throw new ApiError("খরচ খুঁজে পাওয়া যায়নি", 404);

    const expense = repo.updateExpense(user.id, id, {
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.amount !== undefined ? { amount: data.amount } : {}),
      ...(data.note !== undefined ? { note: data.note } : {}),
      ...(data.paidTo !== undefined ? { paidTo: data.paidTo } : {}),
      ...(data.method !== undefined ? { method: data.method } : {}),
      ...(data.date ? { date: parseDateInput(data.date) } : {}),
    });

    logActivity(user.id, {
      action: "update",
      entity: "expense",
      entityId: id,
      title: `খরচ হালনাগাদ — ${expense?.category ?? existing.category}`,
      amount: expense?.amount ?? null,
    });

    return ok({ expense });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    const user = await authUser();
    const { id } = await params;
    const existing = repo.findExpense(user.id, id);
    if (!existing) throw new ApiError("খরচ খুঁজে পাওয়া যায়নি", 404);

    repo.deleteExpense(user.id, id);
    logActivity(user.id, {
      action: "delete",
      entity: "expense",
      entityId: id,
      title: `খরচ মুছে ফেলা হয়েছে — ${existing.category}`,
      amount: existing.amount,
    });

    return ok({ success: true });
  } catch (error) {
    return handleError(error);
  }
}
