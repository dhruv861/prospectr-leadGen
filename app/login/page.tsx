import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SearchCheck } from "lucide-react";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-50 px-4">
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/3 rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle, #4f46e5, transparent 70%)" }}
      />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 shadow-sm">
            <SearchCheck className="h-6 w-6 text-white" strokeWidth={2.25} />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Prospectr</h1>
            <p className="mt-1 text-sm text-slate-500">Sign in to your lead pipeline</p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/50">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
