import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import EmployeeHeader from "./employee-header";
import EmployeeMobileNav from "./mobile-nav";

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "employee") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <EmployeeHeader user={session.user as any} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
      <EmployeeMobileNav user={session.user as any} />
    </div>
  );
}