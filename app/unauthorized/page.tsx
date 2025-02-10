import React from "react";
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="mb-4 text-red-500">
        <ShieldAlert size={64} />
      </div>
      <h1 className="mb-2 text-4xl font-bold text-gray-900">Access Denied</h1>
      <p className="mb-4 text-gray-600">You don't have permission to access this page.</p>
      <Link href="/" className="text-blue-600 transition-colors hover:text-blue-800">
        Return to Home
      </Link>
    </div>
  );
}
