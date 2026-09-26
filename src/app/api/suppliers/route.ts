import * as repo from "@/lib/repo";
import { authUser, handleError, ok, readJson } from "@/lib/api";
import { supplierSchema } from "@/lib/validation";
import { logActivity } from "@/lib/services";
import { round2 } from "@/lib/calc";

export async function GET() {
  try {
    const user = await authUser();
    const suppliers = repo.listSuppliers(user.id);
    const txns = repo.listAllSupplierTransactions(user.id);

    const items = suppliers.map((s) => {
      const own = txns.filter((t) => t.supplierId === s.id);
      const purchases = own.filter((t) => t.type === "PURCHASE").reduce((x, t) => x + t.amount, 0);
      const payments = own.filter((t) => t.type === "PAYMENT").reduce((x, t) => x + t.amount, 0);
      return {
        ...s,
        totalPurchase: round2(purchases),
        totalPayment: round2(payments),
        payable: round2(s.openingBalance + purchases - payments),
        txnCount: own.length,
      };
    });

    return ok({ suppliers: items });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await authUser();
    const body = await readJson(request);
    const data = supplierSchema.parse(body);

    const supplier = repo.createSupplier(user.id, {
      name: data.name,
      phone: data.phone ?? null,
      address: data.address ?? null,
      note: data.note ?? null,
      openingBalance: round2(data.openingBalance ?? 0),
      isActive: data.isActive ?? true,
    });

    logActivity(user.id, {
      action: "create",
      entity: "supplier",
      entityId: supplier.id,
      title: `নতুন সাপ্লায়ার — ${supplier.name}`,
      detail: supplier.phone,
      amount: supplier.openingBalance || null,
    });

    return ok({ supplier }, 201);
  } catch (error) {
    return handleError(error);
  }
}
