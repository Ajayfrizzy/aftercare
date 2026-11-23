import { type NextRequest, NextResponse } from "next/server";
export async function proxy(request: NextRequest) {
  const response = await fetch("http://127.0.0.1:3101/api/v1/overview", {
    headers: { authorization: request.headers.get("authorization") ?? "" },
    cache: "no-store",
  }).catch(() => null);
  if (response?.ok) return NextResponse.next();
  if (response?.status === 401)
    return new Response("Sign in to open the private demo.", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Aftercare demo"',
        "Cache-Control": "no-store",
      },
    });
  return new Response("Private journal temporarily unavailable.", {
    status: 503,
  });
}
export const config = { matcher: "/journal/:path*" };
