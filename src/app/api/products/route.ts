import * as repo from "@/lib/repo";
import { authUser, handleError, ok, readJson } from "@/lib/api";
import { productSchema } from "@/lib/validation";
import { logActivity } from "@/lib/services";

export async function GET(request: Request) {
  try {
    const user = await authUser();
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim() ?? "";
    const category = url.searchParams.get("category") ?? "";
    const filter = url.searchParams.get("filter") ?? "";

    let products = repo.listProducts(user.id);
    if (q) {
      const needle = q.toLowerCase();
      products = products.filter(
        (p) => p.name.toLowerCase().includes(needle) || p.category.toLowerCase().includes(needle),
      );
    }
    if (category) products = products.filter((p) => p.category === category);
    if (filter === "low") products = products.filter((p) => p.stock <= p.lowStockAt && p.stock > 0);
    if (filter === "out") products = products.filter((p) => p.stock <= 0);

    return ok({ products });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await authUser();
    const body = await readJson(request);
    const data = productSchema.parse(body);

    const product = repo.createProduct(user.id, {
      name: data.name,
      category: data.category ?? "মুদি",
      unit: data.unit ?? "পিস",
      sellPrice: data.sellPrice ?? 0,
      buyPrice: data.buyPrice ?? 0,
      stock: data.stock ?? 0,
      lowStockAt: data.lowStockAt ?? 5,
      isActive: data.isActive ?? true,
    });

    logActivity(user.id, {
      action: "create",
      entity: "product",
      entityId: product.id,
      title: `নতুন পণ্য যোগ — ${product.name}`,
      detail: `স্টক ${product.stock} ${product.unit}`,
    });

    return ok({ product }, 201);
  } catch (error) {
    return handleError(error);
  }
}
