import * as repo from "@/lib/repo";
import { authUser, handleError, ok, readJson } from "@/lib/api";
import { customerSchema } from "@/lib/validation";
import { balancesFromGrouped, logActivity } from "@/lib/services";
import { round2 } from "@/lib/calc";

export async function GET(request: Request) {
  try {
    const user = await authUser();
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim() ?? "";
    const tag = url.searchParams.get("tag")?.trim() ?? "";
    const status = url.searchParams.get("status") ?? "";
    const sort = url.searchParams.get("sort") ?? "due";
    const withBalance = url.searchParams.get("balance") !== "0";

    let customers = repo.listCustomers(user.id);

    if (status === "active") customers = customers.filter((c) => c.isActive);
    if (status === "inactive") customers = customers.filter((c) => !c.isActive);
    if (tag) customers = customers.filter((c) => c.tag === tag);
    if (q) {
      const needle = q.toLowerCase();
      customers = customers.filter((c) =>
        [c.name, c.phone, c.address, c.tag].some((v) => v?.toLowerCase().includes(needle)),
      );
    }

    if (!withBalance) return ok({ customers });

    const txns = repo.listTxnRows(user.id).filter((t) => t.customerId);
    const balances = balancesFromGrouped(customers, txns);

    const items = customers.map((c) => ({
      ...c,
      ...(balances.get(c.id) ?? {
        due: c.openingBalance,
        totalDue: 0,
        totalPaid: 0,
        totalDiscount: 0,
        totalSale: 0,
        lastActivityAt: null,
        txnCount: 0,
      }),
    }));

    const sorters: Record<string, (a: (typeof items)[number], b: (typeof items)[number]) => number> = {
      due: (a, b) => b.due - a.due,
      name: (a, b) => a.name.localeCompare(b.name, "bn"),
      recent: (a, b) => (b.lastActivityAt?.getTime() ?? 0) - (a.lastActivityAt?.getTime() ?? 0),
      oldest: (a, b) => (a.lastActivityAt?.getTime() ?? 0) - (b.lastActivityAt?.getTime() ?? 0),
    };
    items.sort(sorters[sort] ?? sorters.due);

    return ok({ customers: items });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await authUser();
    const body = await readJson(request);
    const data = customerSchema.parse(body);

    const customer = repo.createCustomer(user.id, {
      name: data.name,
      phone: data.phone ?? null,
      address: data.address ?? null,
      note: data.note ?? null,
      tag: data.tag ?? "নিয়মিত",
      color: data.color ?? "emerald",
      openingBalance: round2(data.openingBalance ?? 0),
      creditLimit: data.creditLimit ?? null,
      isActive: data.isActive ?? true,
    });

    logActivity(user.id, {
      action: "create",
      entity: "customer",
      entityId: customer.id,
      title: `নতুন কাস্টমার যোগ করা হয়েছে — ${customer.name}`,
      detail: customer.phone,
      amount: customer.openingBalance || null,
    });

    return ok({ customer }, 201);
  } catch (error) {
    return handleError(error);
  }
}
