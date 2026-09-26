import * as repo from "@/lib/repo";
import { ApiError, authUser, handleError, ok, readJson } from "@/lib/api";
import { productUpdateSchema } from "@/lib/validation";
import { logActivity } from "@/lib/services";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const user = await authUser();
    const { id } = await params;
    const body = await readJson(request);
    const data = productUpdateSchema.parse(body);

    const existing = repo.findProduct(user.id, id);
    if (!existing) throw new ApiError("পণ্য খুঁজে পাওয়া যায়নি", 404);

    const product = repo.updateProduct(user.id, id, data);

    logActivity(user.id, {
      action: "update",
      entity: "product",
      entityId: id,
      title: `পণ্য হালনাগাদ — ${product?.name ?? existing.name}`,
      detail: product ? `স্টক ${product.stock} ${product.unit}` : null,
    });

    return ok({ product });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    const user = await authUser();
    const { id } = await params;
    const existing = repo.findProduct(user.id, id);
    if (!existing) throw new ApiError("পণ্য খুঁজে পাওয়া যায়নি", 404);

    repo.deleteProduct(user.id, id);
    logActivity(user.id, {
      action: "delete",
      entity: "product",
      entityId: id,
      title: `পণ্য মুছে ফেলা হয়েছে — ${existing.name}`,
    });

    return ok({ success: true });
  } catch (error) {
    return handleError(error);
  }
}
