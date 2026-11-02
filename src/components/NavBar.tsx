import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";

export default async function NavBar() {
  const { userId } = await auth();

  return (
    <nav className="sticky top-0 z-50 glass border-b border-white/[0.06]">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <span className="text-sm font-bold tracking-tight text-white">Price Advisor</span>
        </Link>
        <div className="flex items-center gap-5 text-sm">
          <Link href="/" className="text-white/60 hover:text-white transition-colors">
            Home
          </Link>
          <Link href="/dashboard" className="text-white/60 hover:text-white transition-colors">
            Dashboard
          </Link>
          {userId ? (
            <UserButton />
          ) : (
            <Link
              href="/sign-in"
              className="rounded-lg btn-gradient px-4 py-2 text-xs font-semibold"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
