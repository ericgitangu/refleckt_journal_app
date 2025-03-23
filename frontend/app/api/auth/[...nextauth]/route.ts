import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

// Use the auth options defined in the lib/auth directory
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
