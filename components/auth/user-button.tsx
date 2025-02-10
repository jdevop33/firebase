'use client';


import { UserButton as ClerkUserButton } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { useTheme } from 'next-themes';

export function UserButton() {
  const { theme } = useTheme();

  return (
    <ClerkUserButton
      appearance={{
        baseTheme: theme === 'dark' ? dark : undefined,
        elements: {
          avatarBox: 'w-10 h-10',
        },
      }}
    />
  );
}
