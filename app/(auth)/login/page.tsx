"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginInput } from "@/lib/validators";
import { login, loginWithOTP, verifyOTP } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  // Email form
  const { register: registerEmail, handleSubmit: handleEmailSubmit, formState: { errors: emailErrors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  // Phone OTP form
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [token, setToken] = useState("");

  const onEmailSubmit = async (data: LoginInput) => {
    setIsPending(true);
    setError(null);
    const res = await login(data);
    if (res?.error) {
      setError(res.error);
    }
    setIsPending(false);
  };

  const onPhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    setIsPending(true);
    setError(null);
    
    if (otpSent) {
      const res = await verifyOTP(phone, token);
      if (res?.error) {
        setError(res.error);
      }
    } else {
      const res = await loginWithOTP(phone);
      if (res?.error) {
        setError(res.error);
      } else {
        setOtpSent(true);
        setSuccess(res.success || "OTP sent");
      }
    }
    setIsPending(false);
  };

  return (
    <div className="flex justify-center items-center min-h-[80vh] px-4">
      <Card className="w-full max-w-md shadow-lg border-primary/10">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold tracking-tight text-primary">Welcome back</CardTitle>
          <CardDescription>Choose your preferred sign in method</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="email">Email</TabsTrigger>
            </TabsList>

            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md flex items-center mb-4">
                <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
                {error}
              </div>
            )}
            
            {success && (
              <div className="bg-green-100 text-green-800 text-sm p-3 rounded-md flex items-center mb-4">
                <CheckCircle2 className="w-4 h-4 mr-2 shrink-0" />
                {success}
              </div>
            )}

            <TabsContent value="email">
              <form onSubmit={handleEmailSubmit(onEmailSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="name@example.com"
                    {...registerEmail("email")}
                    className="h-12 text-base"
                  />
                  {emailErrors.email && <p className="text-destructive text-xs">{emailErrors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    {...registerEmail("password")}
                    className="h-12 text-base"
                  />
                  {emailErrors.password && <p className="text-destructive text-xs">{emailErrors.password.message}</p>}
                </div>
                <Button type="submit" className="w-full h-12 text-lg" disabled={isPending}>
                  {isPending ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="phone">
              <form onSubmit={onPhoneSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    type="tel" 
                    placeholder="+2348000000000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={otpSent}
                    className="h-12 text-base"
                  />
                </div>
                
                {otpSent && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <Label htmlFor="token">Verification Code</Label>
                    <Input 
                      id="token" 
                      type="text" 
                      placeholder="123456"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      className="h-12 text-base text-center tracking-widest font-mono"
                    />
                  </div>
                )}
                
                <Button type="submit" className="w-full h-12 text-lg" disabled={isPending || !phone || (otpSent && !token)}>
                  {isPending ? "Please wait..." : (otpSent ? "Verify Code" : "Send Code")}
                </Button>
                
                {otpSent && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="w-full text-sm" 
                    onClick={() => { setOtpSent(false); setToken(""); setError(null); setSuccess(null); }}
                  >
                    Use a different number
                  </Button>
                )}
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-center text-muted-foreground w-full">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary hover:underline font-medium">
              Register here
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
