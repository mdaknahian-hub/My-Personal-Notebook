import * as repo from "@/lib/repo";
import { ApiError, authUser, handleError, ok, readJson } from "@/lib/api";
import { supplierTransactionSchema, supplierUpdateSchema } from "@/lib/validation";
import { logActivity } from "@/lib/services";
import { round2 } from "@/lib/calc";
import { parseDateInput } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  try {
    const user = await authUser();
    const { id } = await params;
    const supplier = repo.findSupplier(user.id, id);
    if (!supplier) throw new ApiError("সাপ্লায়ার খুঁজে পাওয়া যায়নি", 404);

    const transactions = repo.listSupplierTransactions(id, "asc");
    let balance = supplier.openingBalance;
    const rows = transactions.map((t) => {
      balance = round2(balance + (t.type === "PURCHASE" ? t.amount : -t.amount));
      return { ...t, balance };
    });

    return ok({ supplier, rows, payable: balance });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const user = await authUser();
    const { id } = await params;
    const body = await readJson(request);
    const data = supplierUpdateSchema.parse(body);

    const existing = repo.findSupplier(user.id, id);
    if (!existing) throw new ApiError("সাপ্লায়ার খুঁজে পাওয়া যায়নি", 404);

    const supplier = repo.updateSupplier(user.id, id, data);
    logActivity(user.id, {
      action: "update",
      entity: "supplier",
      entityId: id,
      title: `সাপ্লায়ার হালনাগাদ — ${supplier?.name ?? existing.name}`,
    });

    return ok({ supplier });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    const user = await authUser();
    const { id } = await params;
    const existing = repo.findSupplier(user.id, id);
    if (!existing) throw new ApiError("সাপ্লায়ার খুঁজে পাওয়া যায়নি", 404);

    repo.deleteSupplier(user.id, id);
    logActivity(user.id, {
      action: "delete",
      entity: "supplier",
      entityId: id,
      title: `সাপ্লায়ার মুছে ফেলা হয়েছে — ${existing.name}`,
    });

    return ok({ success: true });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request, { params }: Ctx) {
  try {
    const user = await authUser();
    const { id } = await params;
    const body = await readJson(request);
    const data = supplierTransactionSchema.parse({ ...(body as object), supplierId: id });

    const supplier = repo.findSupplier(user.id, id);
    if (!supplier) throw new ApiError("সাপ্লায়ার খুঁজে পাওয়া যায়নি", 404);

    const transaction = repo.createSupplierTransaction(user.id, {
      supplierId: id,
      type: data.type,
      amount: round2(data.amount),
      note: data.note ?? null,
      date: parseDateInput(data.date),
    });

    logActivity(user.id, {
      action: "create",
      entity: "supplier",
      entityId: id,
      title:
        data.type === "PURCHASE"
          ? `${supplier.name} থেকে মাল কেনা হয়েছে`
          : `${supplier.name} কে পরিশোধ করা হয়েছে`,
      amount: transaction.amount,
    });

    return ok({ transaction }, 201);
  } catch (error) {
    return handleError(error);
  }
}
