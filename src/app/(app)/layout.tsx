import TopNav from "@/components/TopNav";
import { authEnabled } from "@/lib/auth/config";

// Reads runtime env (auth state); must not be statically prerendered.
export const dynamic = "force-dynamic";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <TopNav showSignOut={authEnabled()} />
      <main className="mx-auto w-full max-w-[1400px] px-4 py-4">{children}</main>
    </>
  );
}
