import * as repo from "@/lib/repo";
import {
  createSessionToken,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { ApiError, handleError, ok, readJson } from "@/lib/api";
import { ensureDemoSeed } from "@/lib/seed";
import { toEnDigits } from "@/lib/format";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const data = loginSchema.parse(body);
    const phone = toEnDigits(data.phone).replace(/\s/g, "");

    // ডেটাবেস একদম খালি হলে ডেমো অ্যাকাউন্ট তৈরি হয়ে যাবে
    await ensureDemoSeed();

    const user = repo.findUserByPhone(phone);
    if (!user || !(await verifyPassword(data.password, user.passwordHash))) {
      throw new ApiError("মোবাইল নম্বর বা পাসওয়ার্ড সঠিক নয়", 401);
    }

    const token = await createSessionToken({
      userId: user.id,
      name: user.name,
      phone: user.phone,
    });
    await setSessionCookie(token);

    return ok({ user: { id: user.id, name: user.name, shopName: user.shopName } });
  } catch (error) {
    return handleError(error);
  }
}
