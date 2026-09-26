import { requireUser } from "@/lib/auth";
import { getBootstrapData } from "@/lib/queries";
import { StoreProvider } from "@/components/providers/store";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const data = await getBootstrapData(user.id);

  return (
    <StoreProvider initial={data}>
      <AppShell>{children}</AppShell>
    </StoreProvider>
  );
}
