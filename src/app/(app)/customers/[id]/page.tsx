import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getCustomerProfile } from "@/lib/queries";
import { CustomerDetailClient } from "@/components/pages/customer-detail-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const profile = getCustomerProfile(user.id, id);
  return { title: profile ? profile.customer.name : "কাস্টমার" };
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const profile = getCustomerProfile(user.id, id);
  if (!profile) notFound();

  return <CustomerDetailClient customerId={id} />;
}
