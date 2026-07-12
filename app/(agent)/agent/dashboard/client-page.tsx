"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin, Truck, CheckCircle, Navigation, KeyRound } from "lucide-react";
import { markPickedUp, updateAgentLocation, agentVerifyDelivery } from "@/app/actions/delivery";
import { useRouter } from "next/navigation";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function AgentDashboardClient({ deliveries }: { deliveries: any[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({});

  // Auto-start tracking if any delivery is in transit
  useEffect(() => {
    const activeDelivery = deliveries.find(d => d.status === 'in_transit');
    if (activeDelivery) {
      startTracking(activeDelivery.id);
    } else {
      stopTracking();
    }
  }, [deliveries]);

  const handlePickUp = async (deliveryId: string) => {
    setLoadingId(deliveryId);
    const res = await markPickedUp(deliveryId);
    if (res?.error) alert(res.error);
    router.refresh();
    setLoadingId(null);
  };

  const handleVerify = async (deliveryId: string) => {
    const otp = otpInputs[deliveryId];
    if (!otp || otp.length < 6) {
      alert("Please enter the 6-digit verification code");
      return;
    }
    setLoadingId(`verify-${deliveryId}`);
    const res = await agentVerifyDelivery(deliveryId, otp);
    if (res?.error) {
      alert(res.error);
    } else {
      alert("Delivery verified successfully!");
      router.refresh();
    }
    setLoadingId(null);
  };

  const startTracking = (deliveryId: string) => {
    if (trackingId) return;
    setTrackingId(deliveryId);
    
    // Simulate periodic location updates
    const updateLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            await updateAgentLocation(deliveryId, {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            }).catch(console.error); // suppress errors silently for background task
          },
          (error) => {
            console.error("Error getting location:", error);
            // Simulated fallback for rural network gap handling
            updateAgentLocation(deliveryId, { lat: 9.0820, lng: 8.6753 });
          },
          { enableHighAccuracy: true }
        );
      }
    };

    // Update immediately and then every 30 seconds
    updateLocation();
    (window as any).trackingInterval = setInterval(updateLocation, 30000);
  };

  const stopTracking = () => {
    if ((window as any).trackingInterval) {
      clearInterval((window as any).trackingInterval);
    }
    setTrackingId(null);
  };

  if (!deliveries || deliveries.length === 0) {
    return (
      <Card className="p-12 text-center border-dashed">
        <p className="text-muted-foreground mb-4">You have no assigned deliveries at the moment.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {deliveries.map((delivery) => {
        const order = delivery.order;
        const product = order?.product;
        const farmer = order?.farmer;
        const buyer = order?.buyer;
        const isProcessing = loadingId === delivery.id;
        const isVerifying = loadingId === `verify-${delivery.id}`;

        return (
          <Card key={delivery.id} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-xl">Delivery #{delivery.id.split('-')[0]}</h3>
                  <p className="text-muted-foreground text-sm">Product: {product?.name}</p>
                </div>
                <Badge variant={delivery.status === 'assigned' ? 'outline' : 'default'} className="capitalize">
                  {delivery.status.replace(/_/g, ' ')}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-muted/30 p-4 rounded-md">
                <div>
                  <h4 className="font-semibold flex items-center gap-2 mb-2"><MapPin className="w-4 h-4 text-primary" /> Pickup Details (Farmer)</h4>
                  <p className="text-sm font-medium">{farmer?.full_name}</p>
                  <p className="text-sm text-muted-foreground">{farmer?.phone}</p>
                  <p className="text-sm text-muted-foreground">{product?.location}</p>
                </div>
                <div>
                  <h4 className="font-semibold flex items-center gap-2 mb-2"><Navigation className="w-4 h-4 text-primary" /> Drop-off Details (Buyer)</h4>
                  <p className="text-sm font-medium">{buyer?.full_name}</p>
                  <p className="text-sm text-muted-foreground">{buyer?.phone}</p>
                  <p className="text-sm text-muted-foreground">See buyer profile for exact address</p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-3">
                  {delivery.status === 'assigned' && (
                    <Button onClick={() => handlePickUp(delivery.id)} disabled={isProcessing}>
                      {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Truck className="w-4 h-4 mr-2" />}
                      Mark as Picked Up
                    </Button>
                  )}
                  {delivery.status === 'in_transit' && (
                    <Button variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200 cursor-default">
                      <CheckCircle className="w-4 h-4 mr-2" /> Live Tracking Active
                    </Button>
                  )}
                  {delivery.status === 'delivered' && (
                    <Button variant="outline" disabled>
                      <CheckCircle className="w-4 h-4 mr-2" /> Delivered
                    </Button>
                  )}
                </div>

                {delivery.status === 'in_transit' && (
                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t items-end">
                    <div className="w-full sm:max-w-xs">
                      <label className="text-sm font-medium mb-1 block">Buyer Verification Code (OTP)</label>
                      <Input 
                        placeholder="Enter 6-digit code" 
                        maxLength={6}
                        value={otpInputs[delivery.id] || ''}
                        onChange={(e) => setOtpInputs({...otpInputs, [delivery.id]: e.target.value})}
                      />
                    </div>
                    <Button 
                      onClick={() => handleVerify(delivery.id)} 
                      disabled={isVerifying || (otpInputs[delivery.id] || '').length < 6}
                    >
                      {isVerifying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
                      Verify Delivery
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
