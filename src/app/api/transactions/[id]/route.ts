import * as repo from "@/lib/repo";
import { ApiError, authUser, handleError, ok, readJson } from "@/lib/api";
import { transactionUpdateSchema } from "@/lib/validation";
import { applyStockForItems, assertCustomerOwned, logActivity } from "@/lib/services";
import { round2 } from "@/lib/calc";
import { parseDateInput } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const user = await authUser();
    const { id } = await params;
    const body = await readJson(request);
    const data = transactionUpdateSchema.parse(body);

    const existing = repo.findTransaction(user.id, id);
    if (!existing) throw new ApiError("লেনদেন খুঁজে পাওয়া যায়নি", 404);
    if (data.customerId) assertCustomerOwned(user.id, data.customerId);

    // স্টক: আগের প্রভাব ফিরিয়ে নতুন প্রভাব প্রয়োগ
    const restoresStock = existing.type === "DUE" || existing.type === "CASH_SALE";
    if (restoresStock && existing.items.length) {
      applyStockForItems(existing.items, 1);
    }

    const transaction = repo.updateTransactionRow(
      user.id,
      id,
      {
        ...(data.customerId !== undefined ? { customerId: data.customerId || null } : {}),
        ...(data.type ? { type: data.type } : {}),
        ...(data.amount !== undefined ? { amount: round2(data.amount) } : {}),
        ...(data.discount !== undefined ? { discount: round2(data.discount) } : {}),
        ...(data.note !== undefined ? { note: data.note } : {}),
        ...(data.date ? { date: parseDateInput(data.date) } : {}),
        ...(data.method !== undefined ? { method: data.method } : {}),
      },
      data.items
        ? data.items.map((it) => ({
            productId: it.productId || null,
            name: it.name,
            unit: it.unit ?? null,
            qty: it.qty,
            unitPrice: it.unitPrice,
          }))
        : undefined,
    );

    const nextType = data.type ?? existing.type;
    const nextItems = data.items ?? existing.items;
    const shouldAdjust = data.adjustStock ?? true;
    if (shouldAdjust && nextItems.length && (nextType === "DUE" || nextType === "CASH_SALE")) {
      applyStockForItems(nextItems, -1);
    }

    logActivity(user.id, {
      action: "update",
      entity: "transaction",
      entityId: id,
      title: `লেনদেন পরিবর্তন — ${transaction?.customer?.name ?? "নগদ ক্রেতা"}`,
      amount: transaction?.amount ?? null,
    });

    return ok({ transaction });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    const user = await authUser();
    const { id } = await params;
    const existing = repo.findTransaction(user.id, id);
    if (!existing) throw new ApiError("লেনদেন খুঁজে পাওয়া যায়নি", 404);

    if ((existing.type === "DUE" || existing.type === "CASH_SALE") && existing.items.length) {
      applyStockForItems(existing.items, 1);
    }

    repo.deleteTransaction(user.id, id);

    logActivity(user.id, {
      action: "delete",
      entity: "transaction",
      entityId: id,
      title: `লেনদেন মুছে ফেলা হয়েছে — ${existing.customer?.name ?? "নগদ ক্রেতা"}`,
      amount: existing.amount,
    });

    return ok({ success: true });
  } catch (error) {
    return handleError(error);
  }
}
