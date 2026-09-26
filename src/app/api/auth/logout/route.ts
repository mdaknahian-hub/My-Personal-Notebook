import { clearSessionCookie } from "@/lib/auth";
import { handleError, ok } from "@/lib/api";

export async function POST() {
  try {
    await clearSessionCookie();
    return ok({ success: true });
  } catch (error) {
    return handleError(error);
  }
}
