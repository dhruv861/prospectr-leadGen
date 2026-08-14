import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import Sidebar from "./Sidebar";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar userName={session.user.name ?? ""} userRole={session.user.role} signOutAction={signOutAction} />
      <main className="min-w-0 flex-1 overflow-y-auto px-4 pb-8 pt-20 lg:px-8 lg:pt-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
