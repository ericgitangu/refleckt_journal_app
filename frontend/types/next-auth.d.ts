import { DefaultSession, DefaultJWT } from "next-auth";
import React from 'react';
import { Session } from 'next-auth';

declare module "next-auth" {
  interface Session extends DefaultSession {
    accessToken?: string;
    refreshToken?: string;
    user?: {
      id?: string;
      name?: string;
      email?: string;
      image?: string;
    } & DefaultSession["user"];
  }
  
  interface User {
    id: string;
    name?: string;
    email?: string;
    image?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    provider?: string;
  }
}

declare module 'next-auth/react' {
  export interface SessionProviderProps {
    children: React.ReactNode;
    session?: Session | null;
    refetchInterval?: number;
    refetchOnWindowFocus?: boolean;
  }

  export function SessionProvider(props: SessionProviderProps): JSX.Element;
} 