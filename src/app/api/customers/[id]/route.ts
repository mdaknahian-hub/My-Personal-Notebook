import * as repo from "@/lib/repo";
import { ApiError, authUser, handleError, ok, readJson } from "@/lib/api";
import { customerUpdateSchema } from "@/lib/validation";
import { getCustomerLedger, logActivity } from "@/lib/services";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  try {
    const user = await authUser();
    const { id } = await params;
    const ledger = getCustomerLedger(user.id, id);
    return ok(ledger);
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const user = await authUser();
    const { id } = await params;
    const body = await readJson(request);
    const data = customerUpdateSchema.parse(body);

    const existing = repo.findCustomer(user.id, id);
    if (!existing) throw new ApiError("কাস্টমার খুঁজে পাওয়া যায়নি", 404);

    const customer = repo.updateCustomer(user.id, id, {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.phone !== undefined ? { phone: data.phone } : {}),
      ...(data.address !== undefined ? { address: data.address } : {}),
      ...(data.note !== undefined ? { note: data.note } : {}),
      ...(data.tag !== undefined ? { tag: data.tag } : {}),
      ...(data.color !== undefined ? { color: data.color } : {}),
      ...(data.openingBalance !== undefined ? { openingBalance: data.openingBalance } : {}),
      ...(data.creditLimit !== undefined ? { creditLimit: data.creditLimit } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    });

    logActivity(user.id, {
      action: "update",
      entity: "customer",
      entityId: id,
      title: `কাস্টমারের তথ্য হালনাগাদ — ${customer?.name ?? existing.name}`,
    });

    return ok({ customer });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    const user = await authUser();
    const { id } = await params;
    const existing = repo.findCustomer(user.id, id);
    if (!existing) throw new ApiError("কাস্টমার খুঁজে পাওয়া যায়নি", 404);

    repo.deleteCustomer(user.id, id);
    logActivity(user.id, {
      action: "delete",
      entity: "customer",
      entityId: id,
      title: `কাস্টমার মুছে ফেলা হয়েছে — ${existing.name}`,
    });

    return ok({ success: true });
  } catch (error) {
    return handleError(error);
  }
}
