import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";

export default async function NavBar() {
  const { userId } = await auth();

  return (
    <nav className="sticky top-0 z-10 border-b border-ink/10 bg-white">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Price Advisor
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/" className="text-ink/70 hover:text-ink">Home</Link>
          <Link href="/dashboard" className="text-ink/70 hover:text-ink">Dashboard</Link>
          {userId ? (
            <UserButton />
          ) : (
            <Link href="/sign-in" className="rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-paper">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
