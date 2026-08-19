import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Without Supabase credentials, the app intentionally runs as a labeled preview workspace.
  if (!url || !key) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const publicApiPaths = [
    "/api/checkout",
    "/api/webhooks/stripe",
    "/api/track",
    "/api/tickets/qr",
    "/api/waitlist",
  ];
  const isPublicApi = publicApiPaths.some((prefix) => path.startsWith(prefix));
  const requiresUser =
    path.startsWith("/admin") ||
    path === "/check-in" ||
    (path.startsWith("/api/") && !isPublicApi);
  if (!user && requiresUser && path.startsWith("/api/")) {
    return Response.json({ error: "Sign in to continue." }, { status: 401 });
  }
  if (!user && requiresUser) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", path);
    return NextResponse.redirect(loginUrl);
  }
  if (user && request.nextUrl.pathname === "/login") {
    const adminUrl = request.nextUrl.clone();
    adminUrl.pathname = "/admin";
    adminUrl.search = "";
    return NextResponse.redirect(adminUrl);
  }
  if (user) {
    const { data: memberships } = await supabase
      .from("user_roles")
      .select("roles(key)")
      .eq("user_id", user.id);
    const roleKeys = (memberships ?? []).flatMap((membership) => {
      const roles = membership.roles as
        { key?: string } | { key?: string }[] | null;
      return Array.isArray(roles)
        ? roles.map((role) => role.key)
        : [roles?.key];
    });
    const role = roleKeys.includes("owner")
      ? "owner"
      : roleKeys.includes("manager")
        ? "manager"
        : roleKeys.includes("staff")
          ? "staff"
          : "door";
    const doorOnlyAllowed =
      path === "/check-in" ||
      path.startsWith("/api/check-in") ||
      path.startsWith("/api/guest-check-in") ||
      (!path.startsWith("/admin") && !path.startsWith("/api/"));
    if (role === "door" && !doorOnlyAllowed) {
      if (path.startsWith("/api/"))
        return Response.json(
          { error: "This action is not available for the Door role." },
          { status: 403 },
        );
      const doorUrl = request.nextUrl.clone();
      doorUrl.pathname = "/check-in";
      doorUrl.search = "";
      return NextResponse.redirect(doorUrl);
    }
    const managerOnly = [
      "/admin/guests",
      "/admin/customers",
      "/admin/analytics",
      "/admin/menu",
      "/api/menu",
      "/api/site-content",
      "/api/campaigns",
      "/api/refunds",
      "/api/guests",
      "/api/promoters",
      "/api/qr",
      "/api/customers",
    ];
    const ownerOnly = [
      "/admin/settings",
      "/api/settings",
      "/api/locations",
      "/api/team",
      "/api/health",
    ];
    const isManager = role === "manager" || role === "owner";
    if (!isManager && managerOnly.some((prefix) => path.startsWith(prefix))) {
      if (path.startsWith("/api/"))
        return Response.json(
          { error: "A Manager or Owner is required for this action." },
          { status: 403 },
        );
      const homeUrl = request.nextUrl.clone();
      homeUrl.pathname = "/admin";
      homeUrl.search = "?access=limited";
      return NextResponse.redirect(homeUrl);
    }
    if (
      role !== "owner" &&
      ownerOnly.some((prefix) => path.startsWith(prefix))
    ) {
      if (path.startsWith("/api/"))
        return Response.json(
          { error: "Only an Owner can use this setting." },
          { status: 403 },
        );
      const homeUrl = request.nextUrl.clone();
      homeUrl.pathname = "/admin";
      homeUrl.search = "?access=owner";
      return NextResponse.redirect(homeUrl);
    }
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|oasis-mark.svg|.well-known/workflow/).*)",
  ],
};
