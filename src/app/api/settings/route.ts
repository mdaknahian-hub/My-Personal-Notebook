import * as repo from "@/lib/repo";
import { authUser, handleError, ok, readJson } from "@/lib/api";
import { settingsSchema } from "@/lib/validation";
import { publicUser } from "@/lib/models";

export async function GET() {
  try {
    const user = await authUser();
    return ok({ user: publicUser(user) });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await authUser();
    const body = await readJson(request);
    const data = settingsSchema.parse(body);

    const updated = repo.updateUser(user.id, {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.shopName !== undefined ? { shopName: data.shopName } : {}),
      ...(data.shopAddress !== undefined ? { shopAddress: data.shopAddress } : {}),
      ...(data.shopPhone !== undefined ? { shopPhone: data.shopPhone } : {}),
      ...(data.shopTagline !== undefined ? { shopTagline: data.shopTagline } : {}),
      ...(data.lowStockAlert !== undefined ? { lowStockAlert: data.lowStockAlert } : {}),
      ...(data.bengaliDigits !== undefined ? { bengaliDigits: data.bengaliDigits } : {}),
      ...(data.reminderTemplate !== undefined ? { reminderTemplate: data.reminderTemplate } : {}),
      ...(data.theme !== undefined ? { theme: data.theme } : {}),
    });

    return ok({ user: publicUser(updated) });
  } catch (error) {
    return handleError(error);
  }
}
