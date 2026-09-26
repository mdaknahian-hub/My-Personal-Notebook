import * as repo from "@/lib/repo";
import { authUser, handleError, ok, readJson } from "@/lib/api";
import { expenseSchema } from "@/lib/validation";
import { logActivity } from "@/lib/services";
import { parseDateInput } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const user = await authUser();
    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const category = url.searchParams.get("category");

    const expenses = repo.listExpenses(user.id, {
      from: from ? parseDateInput(from) : null,
      to: to ? new Date(`${to}T23:59:59`).toISOString() : null,
      category,
    });

    return ok({ expenses });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await authUser();
    const body = await readJson(request);
    const data = expenseSchema.parse(body);

    const expense = repo.createExpense(user.id, {
      category: data.category ?? "অন্যান্য",
      amount: data.amount,
      note: data.note ?? null,
      paidTo: data.paidTo ?? null,
      method: data.method ?? "নগদ",
      date: parseDateInput(data.date),
    });

    logActivity(user.id, {
      action: "create",
      entity: "expense",
      entityId: expense.id,
      title: `খরচ যোগ — ${expense.category}`,
      detail: expense.note,
      amount: expense.amount,
    });

    return ok({ expense }, 201);
  } catch (error) {
    return handleError(error);
  }
}
