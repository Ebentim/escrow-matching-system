"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveDispute } from "@/app/actions/admin";
import { Loader2, AlertTriangle, ArrowRightLeft, User, DollarSign } from "lucide-react";

export function DisputesClient({ disputes }: { disputes: any[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleResolve = async (disputeId: string, orderId: string, resolution: string) => {
    const notes = prompt(`Enter resolution notes for deciding to ${resolution.replace('_', ' ')}:`);
    if (!notes) return;

    setLoadingId(`resolve-${disputeId}`);
    const result = await resolveDispute(disputeId, orderId, resolution, notes);
    if (result.error) alert(result.error);
    else alert("Dispute resolved successfully.");
    setLoadingId(null);
  };

  if (disputes.length === 0) {
    return (
      <Card className="p-12 text-center border-dashed">
        <p className="text-muted-foreground">No open disputes requiring resolution.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {disputes.map((dispute) => {
        const order = dispute.orders;
        const product = order?.products;
        const buyer = order?.buyer_profiles;
        const farmer = order?.farmer_profiles;
        const escrow = Array.isArray(order?.escrow_transactions) ? order?.escrow_transactions[0] : order?.escrow_transactions;

        return (
          <Card key={dispute.id} className="overflow-hidden">
            <div className="bg-red-50/50 border-b p-4 flex items-center gap-3 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              <div>
                <h3 className="font-semibold">Dispute #{dispute.id.split('-')[0]}</h3>
                <p className="text-sm opacity-80">Raised by: {dispute.users?.full_name} ({dispute.users?.role}) on {new Date(dispute.created_at).toLocaleString()}</p>
              </div>
            </div>
            
            <CardContent className="p-0 flex flex-col md:flex-row">
              <div className="p-6 md:w-1/2 border-r">
                <h4 className="font-medium text-sm text-muted-foreground mb-4 uppercase tracking-wider">Dispute Details</h4>
                <div className="bg-muted/30 p-4 rounded-md mb-4 border border-red-100">
                  <p className="font-medium mb-1">Reason: {dispute.reason}</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{dispute.description}</p>
                </div>

                <h4 className="font-medium text-sm text-muted-foreground mb-3 uppercase tracking-wider mt-6">Order Context</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between pb-2 border-b">
                    <span className="text-muted-foreground">Product</span>
                    <span className="font-medium">{product?.name} ({order?.quantity_ordered} {product?.unit})</span>
                  </div>
                  <div className="flex justify-between pb-2 border-b">
                    <span className="text-muted-foreground flex items-center gap-1"><User className="w-3 h-3"/> Buyer</span>
                    <span className="font-medium">{buyer?.business_name}</span>
                  </div>
                  <div className="flex justify-between pb-2 border-b">
                    <span className="text-muted-foreground flex items-center gap-1"><User className="w-3 h-3"/> Farmer</span>
                    <span className="font-medium">{farmer?.farm_name}</span>
                  </div>
                  <div className="flex justify-between pb-2 border-b">
                    <span className="text-muted-foreground">Order Status</span>
                    <span className="font-medium uppercase">{order?.status}</span>
                  </div>
                </div>
              </div>
              
              <div className="p-6 md:w-1/2 bg-slate-50 flex flex-col">
                <h4 className="font-medium text-sm text-muted-foreground mb-4 uppercase tracking-wider">Escrow Status</h4>
                {escrow ? (
                  <div className="bg-white p-4 rounded-md border mb-6 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center text-primary font-bold text-xl">
                        <DollarSign className="w-5 h-5 mr-1" />
                        {escrow.amount.toLocaleString()}
                      </div>
                      <div className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full uppercase">
                        {escrow.status}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <ArrowRightLeft className="w-3 h-3" />
                      Funds currently held by platform
                    </p>
                  </div>
                ) : (
                  <div className="p-4 border border-dashed rounded-md text-muted-foreground text-sm mb-6">
                    No escrow transaction found for this order.
                  </div>
                )}

                <div className="mt-auto space-y-4 pt-6 border-t border-slate-200">
                  <h4 className="font-medium text-sm text-slate-800">Resolution Actions</h4>
                  <p className="text-xs text-slate-500 mb-2">Select how to resolve this dispute. This action will automatically update escrow funds and order status.</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button 
                      variant="outline" 
                      className="w-full bg-white hover:bg-red-50 hover:text-red-600 border-red-200"
                      onClick={() => handleResolve(dispute.id, order.id, 'refund_buyer')}
                      disabled={loadingId === `resolve-${dispute.id}` || !escrow}
                    >
                      {loadingId === `resolve-${dispute.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refund Buyer"}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full bg-white hover:bg-green-50 hover:text-green-600 border-green-200"
                      onClick={() => handleResolve(dispute.id, order.id, 'release_farmer')}
                      disabled={loadingId === `resolve-${dispute.id}` || !escrow}
                    >
                      {loadingId === `resolve-${dispute.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : "Release to Farmer"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
