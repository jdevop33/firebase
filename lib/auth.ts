import { currentUser } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export type UserRole = 'admin' | 'finance_director' | 'public_works';

export async function checkRole(allowedRoles: UserRole[]) {
  const user = await currentUser();

  if (!user) {
    redirect('/sign-in');
  }

  const userRole = user.publicMetadata.role as UserRole;

  if (!allowedRoles.includes(userRole)) {
    redirect('/unauthorized');
  }

  // Sync user with Supabase
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: existingUser } = await supabase
    .from('users')
    .select()
    .eq('clerk_id', user.id)
    .single();

  if (!existingUser) {
    await supabase.from('users').insert({
      clerk_id: user.id,
      email: user.emailAddresses[0].emailAddress,
      role: userRole,
      full_name: `${user.firstName} ${user.lastName}`,
    });
  }

  return {
    userId: user.id,
    email: user.emailAddresses[0].emailAddress,
    role: userRole,
  };
}

export function hasRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole);
}
