import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CognitoProvider from "next-auth/providers/cognito";

// Define a redirect options interface to match NextAuth's expected params
interface RedirectParams {
  url: string;
  baseUrl: string;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CognitoProvider({
      clientId: process.env.COGNITO_CLIENT_ID || "",
      clientSecret: process.env.COGNITO_CLIENT_SECRET || "",
      issuer: process.env.COGNITO_ISSUER || "",
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_ID || "",
      clientSecret: process.env.GOOGLE_SECRET || "",
    }),
  ],
  pages: {
    signIn: "/login",
    signOut: "/logout",
    error: "/auth/error",
  },
  session: { strategy: "jwt" },
  jwt: { secret: process.env.NEXTAUTH_SECRET },
  callbacks: {
    async jwt({ token, account }) {
      // Store the access token from the OAuth provider
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        token.provider = account.provider;
      }

      // Check if token needs refreshing
      const expiresAt = token.expiresAt as number;
      if (Date.now() < expiresAt * 1000) {
        return token;
      }

      // Implement token refresh logic here if needed for Cognito
      // This would use the refresh token to get a new access token

      return token;
    },
    async session({ session, token }) {
      // Make the token available to the client
      session.accessToken = token.accessToken as string;
      session.refreshToken = token.refreshToken as string;
      session.user = {
        ...session.user,
        id: token.sub as string,
      };
      return session;
    },
    redirect: async (url: string, baseUrl: string) => {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      // Default fallback is the baseUrl
      return baseUrl;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
