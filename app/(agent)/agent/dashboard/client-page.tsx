"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin, Truck, CheckCircle, Navigation, KeyRound } from "lucide-react";
import { markPickedUp, updateAgentLocation, agentVerifyDelivery, claimDelivery } from "@/app/actions/delivery";
import { useRouter } from "next/navigation";
import { useModal } from "@/components/ui/modal-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function AgentDashboardClient({ deliveries, unassignedOrders }: { deliveries: any[], unassignedOrders: any[] }) {
  const router = useRouter();
  const { alert } = useModal();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('active');

  const handleClaim = async (orderId: string) => {
    setLoadingId(`claim-${orderId}`);
    const res = await claimDelivery(orderId);
    if (res?.error) {
      await alert(res.error, "Error");
    } else {
      await alert("Delivery successfully claimed!", "Success");
      router.refresh();
    }
    setLoadingId(null);
  };

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
    if (res?.error) {
      await alert(res.error, "Error");
    } else {
      await alert("Delivery marked as picked up successfully!", "Success");
    }
    router.refresh();
    setLoadingId(null);
  };

  const handleVerify = async (deliveryId: string) => {
    const otp = otpInputs[deliveryId];
    if (!otp || otp.length < 6) {
      await alert("Please enter the 6-digit verification code");
      return;
    }
    setLoadingId(`verify-${deliveryId}`);
    const res = await agentVerifyDelivery(deliveryId, otp);
    if (res?.error) {
      await alert(res.error, "Error");
    } else {
      await alert("Delivery verified successfully!", "Success");
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

  return (
    <div className="space-y-8">
      {/* Unassigned / Pending Orders */}
      {unassignedOrders && unassignedOrders.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-orange-600 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Unassigned Orders Available
          </h2>
          {unassignedOrders.map((order) => {
            const product = order?.product;
            const farmer = order?.farmer;
            const buyer = order?.buyer;
            const isProcessingClaim = loadingId === `claim-${order.id}`;

            return (
              <Card key={order.id} className="overflow-hidden border-orange-200 bg-orange-50/30">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-xl">Order #{order.id.split('-')[0]}</h3>
                      <p className="text-muted-foreground text-sm">Product: {product?.name}</p>
                    </div>
                    <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
                      Unassigned
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-background/50 p-4 rounded-md border border-orange-100">
                    <div>
                      <h4 className="font-semibold flex items-center gap-2 mb-2"><MapPin className="w-4 h-4 text-orange-500" /> Pickup (Farmer)</h4>
                      <p className="text-sm font-medium">{farmer?.full_name}</p>
                      <p className="text-sm text-muted-foreground">{product?.location}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold flex items-center gap-2 mb-2"><Navigation className="w-4 h-4 text-orange-500" /> Drop-off (Buyer)</h4>
                      <p className="text-sm font-medium">{buyer?.full_name}</p>
                      <p className="text-sm text-muted-foreground">See buyer profile for exact address</p>
                    </div>
                  </div>

                  <Button 
                    onClick={() => handleClaim(order.id)} 
                    disabled={isProcessingClaim}
                    className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700"
                  >
                    {isProcessingClaim ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Truck className="w-4 h-4 mr-2" />}
                    Claim Delivery
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Assigned Deliveries */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Truck className="w-5 h-5" />
          My Deliveries
        </h2>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-2 max-w-[400px]">
            <TabsTrigger value="active">Active Deliveries</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="active" className="mt-4 space-y-4">
            {(!deliveries || deliveries.filter(d => ['assigned', 'in_transit'].includes(d.status)).length === 0) ? (
              <Card className="p-12 text-center border-dashed">
                <p className="text-muted-foreground mb-4">You have no active deliveries.</p>
              </Card>
            ) : deliveries.filter(d => ['assigned', 'in_transit'].includes(d.status)).map((delivery) => {
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
          </TabsContent>
          
          <TabsContent value="history" className="mt-4 space-y-4">
            {(!deliveries || deliveries.filter(d => ['delivered', 'verified', 'completed'].includes(d.status)).length === 0) ? (
              <Card className="p-12 text-center border-dashed">
                <p className="text-muted-foreground mb-4">You have no delivery history.</p>
              </Card>
            ) : deliveries.filter(d => ['delivered', 'verified', 'completed'].includes(d.status)).map((delivery) => {
              const order = delivery.order;
              const product = order?.product;
              const farmer = order?.farmer;
              const buyer = order?.buyer;
              
              return (
                <Card key={delivery.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-xl">Delivery #{delivery.id.split('-')[0]}</h3>
                        <p className="text-muted-foreground text-sm">Product: {product?.name}</p>
                      </div>
                      <Badge variant="default" className="bg-green-100 text-green-800 border-green-200 capitalize">
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
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
