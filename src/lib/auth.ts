import { auth, currentUser } from "@clerk/nextjs/server";

export async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await currentUser();
  return user ? { id: userId, email: user.emailAddresses[0]?.emailAddress ?? "" } : null;
}
