import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/robots.txt", "/sitemap.xml"];
const isPublicPath = (path: string) => path === "/" || PUBLIC_PATHS.some((p) => path.startsWith(p));

// Keeps the Supabase session cookie fresh and sends signed-out visitors to /login.
// Authorization (roles) is checked again on the server in every page and action.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(list) {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // getClaims verifies the JWT locally when the project uses asymmetric signing keys.
  // The page still checks the role and household against the database.
  const { data: auth } = await supabase.auth.getClaims();
  const signedIn = Boolean(auth?.claims.sub);

  const isPublic = isPublicPath(request.nextUrl.pathname);
  if (!signedIn && !isPublic && !request.nextUrl.pathname.startsWith("/api")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
