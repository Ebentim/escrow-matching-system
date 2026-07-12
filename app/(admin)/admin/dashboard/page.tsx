import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Package, ShoppingCart, DollarSign, AlertCircle } from "lucide-react";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  
  const { data: metrics } = await supabase.rpc('get_admin_dashboard_metrics');
  const { data: charts } = await supabase.rpc('get_admin_charts');

  const usersCount = Object.values(metrics?.users_by_role || {}).reduce((a: any, b: any) => a + b, 0) as number;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usersCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics?.users_by_role?.farmer || 0} Farmers, {metrics?.users_by_role?.buyer || 0} Buyers
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Listings</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.active_listings || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{metrics?.gross_value?.toLocaleString() || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.values(metrics?.orders_by_status || {}).reduce((a: any, b: any) => a + b, 0) as number}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Disputes</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.open_disputes || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Order Volume (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-end gap-2 border-b pt-4 pb-2 px-2">
              {charts?.order_volume?.length > 0 ? (
                charts.order_volume.map((day: any, i: number) => {
                  const maxCount = Math.max(...charts.order_volume.map((d: any) => d.count));
                  const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center group">
                      <div 
                        className="w-full bg-primary/80 rounded-t-sm group-hover:bg-primary transition-colors"
                        style={{ height: `${height}%`, minHeight: day.count > 0 ? '4px' : '0' }}
                        title={`${day.date}: ${day.count} orders`}
                      />
                    </div>
                  );
                })
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">No recent order data</div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Top Crop Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {charts?.top_crops?.length > 0 ? (
                charts.top_crops.map((crop: any, i: number) => (
                  <div key={i} className="flex items-center">
                    <div className="w-8 text-center text-muted-foreground font-medium">{i + 1}</div>
                    <div className="ml-4 space-y-1 flex-1">
                      <p className="text-sm font-medium leading-none">{crop.crop_type}</p>
                    </div>
                    <div className="ml-auto font-medium">{crop.count}</div>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground text-center py-8">No listings yet</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
