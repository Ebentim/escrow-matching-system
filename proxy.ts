import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";
import { clientEnv } from "@/lib/env";

export async function proxy(request: NextRequest) {
  // First update session and get the modified response
  const response = await updateSession(request);

  // Then do role-based route protection
  const supabase = createServerClient(
    clientEnv.supabase.url,
    clientEnv.supabase.anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  
  // Public routes
  if (path === "/" || path.startsWith("/login") || path.startsWith("/register") || path.startsWith("/auth/callback")) {
    if (user && (path.startsWith("/login") || path.startsWith("/register"))) {
      // Fetch role and redirect
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
        
      if (userData?.role) {
        return NextResponse.redirect(new URL(`/${userData.role}/dashboard`, request.url));
      }
    }
    return response;
  }

  // Protect private routes
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Role-based protection
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = userData?.role;

  if (!role) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (path.startsWith("/farmer") && role !== "farmer") {
    return NextResponse.redirect(new URL(`/${role}/dashboard`, request.url));
  }
  
  if (path.startsWith("/buyer") && role !== "buyer") {
    return NextResponse.redirect(new URL(`/${role}/dashboard`, request.url));
  }

  if (path.startsWith("/agent") && role !== "agent") {
    return NextResponse.redirect(new URL(`/${role}/dashboard`, request.url));
  }

  if (path.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL(`/${role}/dashboard`, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images, etc.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
