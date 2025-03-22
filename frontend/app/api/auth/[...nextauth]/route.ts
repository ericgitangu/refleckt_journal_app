import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import axios from 'axios';
import { NextAuthUser, JWTToken } from '@/types/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        try {
          // Call our backend authentication endpoint
          const response = await axios.post(`${API_URL}/auth/login`, {
            email: credentials?.email,
            password: credentials?.password
          });

          const { user, token } = response.data;

          // Add the token to the user object for session
          return { 
            ...user, 
            accessToken: token 
          } as NextAuthUser;
        } catch (error) {
          console.error('Authentication error:', error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Initial sign in
      if (user) {
        return {
          ...token,
          accessToken: user.accessToken,
          id: user.id,
        } as JWTToken;
      }
      
      // Return previous token on subsequent calls
      return token as JWTToken;
    },
    async session({ session, token }) {
      // Add token and user ID to session
      session.user = {
        ...session.user,
        accessToken: token.accessToken as string,
        id: token.id as string,
      };
      return session;
    }
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
});

export { handler as GET, handler as POST };
