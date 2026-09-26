import { authUser, handleError, ok } from "@/lib/api";
import { getBootstrapData } from "@/lib/queries";

/** ক্লায়েন্ট স্টোর নতুন করে সিঙ্ক করার জন্য সম্পূর্ণ ডেটা */
export async function GET() {
  try {
    const user = await authUser();
    const data = await getBootstrapData(user.id);
    return ok(data);
  } catch (error) {
    return handleError(error);
  }
}
