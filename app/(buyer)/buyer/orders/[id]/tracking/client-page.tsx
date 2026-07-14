"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Truck, User, QrCode, CheckCircle, Loader2 } from "lucide-react";
import { buyerConfirmDelivery } from "@/app/actions/delivery";
import { QRCodeSVG } from 'qrcode.react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function TrackingClientPage({ order, delivery, otp, supabaseUrl, supabaseAnonKey }: { order: any, delivery: any, otp: string | null, supabaseUrl: string, supabaseAnonKey: string }) {
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(delivery.current_location);
  const [status, setStatus] = useState<string>(delivery.status);
  const [orderStatus, setOrderStatus] = useState<string>(order.status);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const channel = supabase
      .channel(`delivery_tracking_${delivery.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'deliveries',
          filter: `id=eq.${delivery.id}`
        },
        (payload) => {
          if (payload.new.current_location) {
            setCurrentLocation(payload.new.current_location);
          }
          if (payload.new.status) {
            setStatus(payload.new.status);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${order.id}`
        },
        (payload) => {
          if (payload.new.status) {
            setOrderStatus(payload.new.status);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [delivery.id, order.id, supabaseUrl, supabaseAnonKey]);

  const handleConfirmReceipt = async () => {
    if (!confirm("Confirm you have received the delivery in good condition?")) return;
    setLoading(true);
    await buyerConfirmDelivery(order.id);
    setLoading(false);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-6">
        <Card className="overflow-hidden">
          <CardHeader className="bg-muted/50 border-b">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl flex items-center gap-2">
                <Truck className="w-5 h-5" /> 
                Live Map View
              </CardTitle>
              <Badge variant={status === 'out_for_delivery' ? 'default' : 'secondary'} className="capitalize">
                {status.replace(/_/g, ' ')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Simple Map Visualization */}
            <div className="w-full h-100 bg-slate-100 relative flex flex-col items-center justify-center border-b">
              {currentLocation ? (
                <>
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                  <div className="z-10 bg-white p-4 rounded-full shadow-lg border border-primary animate-pulse flex items-center justify-center">
                    <Navigation className="w-8 h-8 text-primary" />
                  </div>
                  <div className="z-10 mt-4 bg-white/90 backdrop-blur px-4 py-2 rounded-md shadow text-sm font-mono font-medium">
                    Lat: {currentLocation.lat.toFixed(6)} | Lng: {currentLocation.lng.toFixed(6)}
                  </div>
                </>
              ) : (
                <div className="text-muted-foreground flex flex-col items-center">
                  <MapPin className="w-12 h-12 mb-2 opacity-20" />
                  <p>Location tracking not active yet.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Phase 8 Verification Display */}
        {otp && (orderStatus === 'out_for_delivery' || orderStatus === 'delivered' || orderStatus === 'verified' || orderStatus === 'completed') && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <QrCode className="w-5 h-5" /> Pay-on-Delivery Verification
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row items-center gap-6">
              <div className="bg-white p-4 rounded-lg shadow-sm border inline-block">
                <QRCodeSVG value={otp} size={150} />
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Verification Code (OTP)</p>
                  <p className="text-3xl font-mono font-bold tracking-widest">{otp}</p>
                </div>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Show this QR code or provide the OTP to the delivery agent to verify receipt. Escrow funds will only be released after verification.
                </p>
                <div className="pt-2">
                  <Button 
                    onClick={handleConfirmReceipt} 
                    disabled={loading || orderStatus === 'delivered' || orderStatus === 'completed'}
                    className="w-full sm:w-auto"
                  >
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                    {orderStatus === 'delivered' || orderStatus === 'completed' ? 'Receipt Confirmed' : 'Confirm Receipt'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Delivery Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Agent Assigned</p>
              <div className="flex items-center gap-2 font-medium">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p>{delivery.agent?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{delivery.agent?.phone}</p>
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-1">Order Details</p>
              <p className="font-semibold">{order.product?.name}</p>
              <p className="text-sm">{order.quantity_ordered} units</p>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-1">Pickup From</p>
              <p className="font-medium">{order.farmer?.full_name}</p>
              <p className="text-sm text-muted-foreground">{order.farmer?.phone}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
