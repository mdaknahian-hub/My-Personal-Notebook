import * as repo from "@/lib/repo";
import {
  createSessionToken,
  hashPassword,
  setSessionCookie,
} from "@/lib/auth";
import { registerSchema } from "@/lib/validation";
import { ApiError, handleError, ok, readJson } from "@/lib/api";
import { ensureDemoSeed, seedStarterProducts } from "@/lib/seed";
import { toEnDigits } from "@/lib/format";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const data = registerSchema.parse(body);
    const phone = toEnDigits(data.phone).replace(/\s/g, "");

    if (repo.findUserByPhone(phone)) {
      throw new ApiError("এই মোবাইল নম্বর দিয়ে অ্যাকাউন্ট আছে", 409);
    }

    // প্রথম ইউজার হলে ডেমো ডেটা তৈরি — অ্যাপ শুরু থেকেই জীবন্ত লাগে
    await ensureDemoSeed();

    const user = repo.createUser({
      name: data.name,
      shopName: data.shopName,
      phone,
      email: data.email ?? null,
      shopAddress: data.shopAddress ?? null,
      shopPhone: phone,
      passwordHash: await hashPassword(data.password),
    });

    seedStarterProducts(user.id);

    const token = await createSessionToken({
      userId: user.id,
      name: user.name,
      phone: user.phone,
    });
    await setSessionCookie(token);

    return ok(
      { user: { id: user.id, name: user.name, shopName: user.shopName } },
      201,
    );
  } catch (error) {
    return handleError(error);
  }
}
