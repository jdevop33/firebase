import { auth } from '@clerk/nextjs';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  const { userId } = auth(); // ✅ `auth()` runs synchronously

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center">
      <h1 className="mb-6 text-4xl font-bold">Welcome to Bolt 2.0</h1>
      <p className="mb-8 text-xl text-muted-foreground">Municipal Asset Management Platform</p>

      {!userId ? (
        <div className="space-x-4">
          <Link href="/sign-in">
            <Button size="lg">Sign In</Button>
          </Link>
          <Link href="/sign-up">
            <Button variant="outline" size="lg">
              Sign Up
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-x-4">
          <Link href="/dashboard">
            <Button size="lg">Go to Dashboard</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
