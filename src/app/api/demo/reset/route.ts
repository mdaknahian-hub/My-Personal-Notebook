import { authUser, handleError, ok } from "@/lib/api";
import { seedDemoData } from "@/lib/seed";

/** বর্তমান অ্যাকাউন্টের হিসাব মুছে আবার ডেমো ডেটা তৈরি করে */
export async function POST() {
  try {
    const user = await authUser();
    seedDemoData(user.id);
    return ok({ success: true });
  } catch (error) {
    return handleError(error);
  }
}
