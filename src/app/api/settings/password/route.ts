import * as repo from "@/lib/repo";
import { ApiError, authUser, handleError, ok, readJson } from "@/lib/api";
import { changePasswordSchema } from "@/lib/validation";
import { hashPassword, verifyPassword } from "@/lib/password";

export async function POST(request: Request) {
  try {
    const user = await authUser();
    const body = await readJson(request);
    const data = changePasswordSchema.parse(body);

    const valid = await verifyPassword(data.currentPassword, user.passwordHash);
    if (!valid) throw new ApiError("বর্তমান পাসওয়ার্ড সঠিক নয়", 401);

    repo.updateUser(user.id, { passwordHash: await hashPassword(data.newPassword) });
    return ok({ success: true });
  } catch (error) {
    return handleError(error);
  }
}
