"use client";

import { useState } from "react";
import { useModal } from "@/components/ui/modal-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Loader2 } from "lucide-react";
import { toggleUserStatus } from "@/app/actions/admin";

type AdminUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  is_active: boolean | null;
  created_at: string;
};

export function UsersClient({ users }: { users: AdminUser[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const { alert, confirm } = useModal();

  const filteredUsers = users.filter((u) => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    if (currentStatus === 'active') {
      if (!(await confirm("Are you sure you want to suspend this user?"))) return;
    } else {
      if (!(await confirm("Are you sure you want to reactivate this user?"))) return;
    }

    setLoadingId(userId);
    const result = await toggleUserStatus(userId, currentStatus, "");
    
    if (result.error) {
      await alert(result.error);
    }
    setLoadingId(null);
  };

  return (
    <Card>
      <div className="p-4 border-b flex items-center justify-between">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <CardContent className="p-0">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b bg-muted/50">
              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Name</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Email</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Role</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Joined</th>
                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="h-24 text-center text-muted-foreground">No users found.</td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const accountStatus = user.is_active ? "active" : "suspended";

                  return (
                  <tr key={user.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <td className="p-4 align-middle font-medium">{user.full_name}</td>
                    <td className="p-4 align-middle text-muted-foreground">{user.email}</td>
                    <td className="p-4 align-middle">
                      <Badge variant="outline" className="capitalize">{user.role}</Badge>
                    </td>
                    <td className="p-4 align-middle">
                      <Badge variant={accountStatus === "active" ? "default" : "destructive"} className="capitalize">
                        {accountStatus}
                      </Badge>
                    </td>
                    <td className="p-4 align-middle text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 align-middle text-right">
                      <Button 
                        variant={accountStatus === "active" ? "destructive" : "outline"}
                        size="sm"
                        onClick={() => handleToggleStatus(user.id, accountStatus)}
                        disabled={loadingId === user.id || user.role === 'admin'}
                      >
                        {loadingId === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : accountStatus === "active" ? (
                          <>Suspend</>
                        ) : (
                          <>Reactivate</>
                        )}
                      </Button>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
