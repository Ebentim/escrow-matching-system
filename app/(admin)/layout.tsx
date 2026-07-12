import Link from "next/link";
import { LayoutDashboard, Users, Package, FileWarning, LogOut } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-muted/20">
      {/* Admin Sidebar */}
      <aside className="w-64 bg-background border-r flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold tracking-tight text-primary">FarmConnect Admin</h1>
        </div>
        
        <nav className="flex-1 p-4 flex flex-col gap-2">
          <Link href="/admin/dashboard" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>
          <Link href="/admin/users" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
            <Users className="w-5 h-5" />
            User Management
          </Link>
          <Link href="/admin/products" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
            <Package className="w-5 h-5" />
            Product Approvals
          </Link>
          <Link href="/admin/disputes" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
            <FileWarning className="w-5 h-5" />
            Dispute Resolution
          </Link>
        </nav>
        
        <div className="p-4 border-t">
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-destructive/10 text-destructive">
              <LogOut className="w-5 h-5" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
