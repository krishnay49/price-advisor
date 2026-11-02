import { clerkClient } from "@clerk/nextjs/server";

export async function GET(req: Request) {
  const client = await clerkClient();
  const state = await client.authenticateRequest(req, {
    publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  });
  return Response.json({
    status: state.status,
    reason: state.reason,
    message: state.message,
    hasSessionCookie: (req.headers.get("cookie") ?? "").includes("__session"),
  });
}