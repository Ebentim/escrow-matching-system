"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, RegisterInput } from "@/lib/validators";
import { register } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [role, setRole] = useState<"farmer" | "buyer" | "agent">("buyer");

  const {
    register: formRegister,
    handleSubmit,
    formState: { errors },
    setValue
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: "buyer"
    }
  });

  const onSubmit = async (data: RegisterInput) => {
    setIsPending(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await register(data);
      if (res?.error) {
        setError(res.error);
      } else if (res?.success) {
        setSuccess(res.success);
      }
    } catch (err: unknown) {
      setError("An unexpected error occurred. Please try again.");
    }
    setIsPending(false);
  };

  const handleRoleChange = (newRole: "farmer" | "buyer" | "agent") => {
    setRole(newRole);
    setValue("role", newRole);
  };

  return (
    <div className="flex justify-center items-center min-h-[80vh] px-4 py-8">
      <Card className="w-full max-w-xl shadow-lg border-primary/10">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold tracking-tight text-primary">Create an account</CardTitle>
          <CardDescription>Join FarmConnect today</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="buyer" onValueChange={(val) => handleRoleChange(val as "farmer" | "buyer" | "agent")} className="w-full mb-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="farmer">🌾 Farmer</TabsTrigger>
              <TabsTrigger value="buyer">🛒 Buyer</TabsTrigger>
              <TabsTrigger value="agent">🚚 Agent</TabsTrigger>
            </TabsList>
          </Tabs>

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md flex items-center mb-4">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-100 text-green-800 text-sm p-3 rounded-md flex items-center mb-4">
              <CheckCircle2 className="w-4 h-4 mr-2 flex-shrink-0" />
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input 
                  id="full_name" 
                  {...formRegister("full_name")}
                  className="h-12 text-base"
                />
                {errors.full_name && <p className="text-destructive text-xs">{errors.full_name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  {...formRegister("email")}
                  className="h-12 text-base"
                />
                {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input 
                  id="phone" 
                  type="tel" 
                  {...formRegister("phone")}
                  className="h-12 text-base"
                />
                {errors.phone && <p className="text-destructive text-xs">{errors.phone.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">General Location</Label>
                <Input 
                  id="location" 
                  {...formRegister("location")}
                  className="h-12 text-base"
                  placeholder="e.g. Lagos State"
                />
                {errors.location && <p className="text-destructive text-xs">{errors.location.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                {...formRegister("password")}
                className="h-12 text-base"
              />
              {errors.password && <p className="text-destructive text-xs">{errors.password.message}</p>}
            </div>

            {/* Role Specific Fields */}
            <div className="mt-6 pt-6 border-t border-border">
              <h3 className="text-lg font-medium mb-4">
                {role === "farmer" && "Farmer Details"}
                {role === "buyer" && "Buyer Details"}
                {role === "agent" && "Agent Details"}
              </h3>
              
              {role === "farmer" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="farm_name">Farm Name</Label>
                    <Input id="farm_name" {...formRegister("farm_name")} className="h-12 text-base" />
                    {errors.farm_name && <p className="text-destructive text-xs">{errors.farm_name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="farm_location">Farm Location</Label>
                    <Input id="farm_location" {...formRegister("farm_location")} className="h-12 text-base" />
                    {errors.farm_location && <p className="text-destructive text-xs">{errors.farm_location.message}</p>}
                  </div>
                </div>
              )}

              {role === "buyer" && (
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="business_name">Business/Shop Name</Label>
                    <Input id="business_name" {...formRegister("business_name")} className="h-12 text-base" />
                    {errors.business_name && <p className="text-destructive text-xs">{errors.business_name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="delivery_address">Default Delivery Address</Label>
                    <Input id="delivery_address" {...formRegister("delivery_address")} className="h-12 text-base" />
                    {errors.delivery_address && <p className="text-destructive text-xs">{errors.delivery_address.message}</p>}
                  </div>
                </div>
              )}

              {role === "agent" && (
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vehicle_type">Vehicle Type</Label>
                    <Input id="vehicle_type" {...formRegister("vehicle_type")} className="h-12 text-base" placeholder="e.g. Light Truck" />
                    {errors.vehicle_type && <p className="text-destructive text-xs">{errors.vehicle_type.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="coverage_area">Coverage Area</Label>
                    <Input id="coverage_area" {...formRegister("coverage_area")} className="h-12 text-base" placeholder="e.g. South West" />
                    {errors.coverage_area && <p className="text-destructive text-xs">{errors.coverage_area.message}</p>}
                  </div>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full h-12 text-lg mt-6" disabled={isPending}>
              {isPending ? "Registering..." : "Create Account"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-center text-muted-foreground w-full">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign in here
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
