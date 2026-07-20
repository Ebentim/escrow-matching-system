import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function BuyerWalletPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch escrow transactions for buyer's orders
  const { data: orders } = await supabase
    .from("orders")
    .select(`
      id, total_price, status, created_at,
      product:products ( name ),
      escrow_transactions ( id, amount, status, held_at, released_at )
    `)
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });

  let totalHeld = 0;
  let totalReleased = 0;
  let totalRefunded = 0;

  const transactions = [];

  if (orders) {
    orders.forEach(order => {
      if (order.escrow_transactions && order.escrow_transactions.length > 0) {
        order.escrow_transactions.forEach((tx: any) => {
          if (tx.status === "held") totalHeld += tx.amount;
          if (tx.status === "released") totalReleased += tx.amount;
          if (tx.status === "refunded") totalRefunded += tx.amount;
          
          transactions.push({
            id: tx.id,
            productName: Array.isArray(order.product) ? order.product[0]?.name : order.product?.name,
            amount: tx.amount,
            status: tx.status,
            date: tx.held_at || order.created_at
          });
        });
      }
    });
  }

  transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Wallet (Escrow)</h1>
        <p className="text-muted-foreground mt-2">
          Manage your payments and track funds held securely in escrow.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Funds in Escrow</CardTitle>
            <CardDescription>Currently held for active orders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₦{totalHeld.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Total Paid Out</CardTitle>
            <CardDescription>Funds successfully released to farmers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">₦{totalReleased.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Total Refunded</CardTitle>
            <CardDescription>Funds returned from cancelled/disputed orders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">₦{totalRefunded.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No transactions found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>{new Date(tx.date).toLocaleDateString()}</TableCell>
                    <TableCell>{tx.productName || "Unknown Product"}</TableCell>
                    <TableCell>
                      <Badge variant={
                        tx.status === "held" ? "secondary" : 
                        tx.status === "released" ? "default" : "outline"
                      }>
                        {tx.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">₦{tx.amount.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
