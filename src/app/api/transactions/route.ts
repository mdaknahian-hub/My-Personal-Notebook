import * as repo from "@/lib/repo";
import { ApiError, authUser, handleError, ok, readJson } from "@/lib/api";
import { transactionSchema } from "@/lib/validation";
import { applyStockForItems, assertCustomerOwned, logActivity } from "@/lib/services";
import { round2 } from "@/lib/calc";
import { parseDateInput } from "@/lib/db";

const TYPE_TITLES: Record<string, string> = {
  DUE: "বাকি লেখা হয়েছে",
  PAYMENT: "জমা নেওয়া হয়েছে",
  DISCOUNT: "ছাড় দেওয়া হয়েছে",
  CASH_SALE: "নগদ বিক্রি হয়েছে",
};

export async function GET(request: Request) {
  try {
    const user = await authUser();
    const url = new URL(request.url);
    const customerId = url.searchParams.get("customerId");
    const type = url.searchParams.get("type");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const q = url.searchParams.get("q")?.trim();
    const take = Number(url.searchParams.get("take") ?? 100);

    const transactions = repo.listTransactions(user.id, {
      customerId,
      type,
      from: from ? parseDateInput(from) : null,
      to: to ? new Date(`${to}T23:59:59`).toISOString() : null,
      q: q ?? null,
      take: Math.min(Math.max(take, 1), 500),
      order: "desc",
    });

    return ok({ transactions });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await authUser();
    const body = await readJson(request);
    const data = transactionSchema.parse(body);

    if (!data.customerId && data.type !== "CASH_SALE") {
      throw new ApiError("কাস্টমার নির্বাচন করুন", 422);
    }
    if (data.customerId) assertCustomerOwned(user.id, data.customerId);

    const transaction = repo.createTransaction({
      userId: user.id,
      customerId: data.customerId || null,
      type: data.type,
      amount: round2(data.amount),
      discount: round2(data.discount ?? 0),
      note: data.note ?? null,
      date: parseDateInput(data.date),
      method: data.method ?? (data.type === "PAYMENT" ? "নগদ" : null),
      items: (data.items ?? []).map((it) => ({
        productId: it.productId || null,
        name: it.name,
        unit: it.unit ?? null,
        qty: it.qty,
        unitPrice: it.unitPrice,
      })),
    });

    const items = data.items ?? [];
    if (data.adjustStock && items.length && (data.type === "DUE" || data.type === "CASH_SALE")) {
      applyStockForItems(items, -1);
    }

    logActivity(user.id, {
      action: "create",
      entity: "transaction",
      entityId: transaction.id,
      title: `${transaction.customer?.name ?? "নগদ ক্রেতা"} — ${TYPE_TITLES[data.type]}`,
      detail: data.note ?? null,
      amount: transaction.amount,
    });

    return ok({ transaction }, 201);
  } catch (error) {
    return handleError(error);
  }
}
