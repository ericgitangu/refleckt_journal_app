import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CognitoProvider from "next-auth/providers/cognito";
import { generateBackendToken } from "./jwt";

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
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
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
    async jwt({ token, account, user }) {
      // On initial sign in, generate a backend JWT token
      if (account && user) {
        try {
          // Generate a backend-compatible JWT token
          const backendToken = generateBackendToken({
            id: user.id || token.sub || "",
            email: user.email || "",
            name: user.name || "",
          });

          token.accessToken = backendToken;
          token.backendToken = backendToken;
        } catch (error) {
          console.error("Failed to generate backend token:", error);
          // Fall back to storing user info for later token generation
          token.accessToken = account.access_token;
        }
        token.refreshToken = account.refresh_token;
        token.expiresAt = Math.floor(Date.now() / 1000) + 24 * 60 * 60; // 24 hours
        token.provider = account.provider;
      }

      // Check if backend token needs refreshing (24 hour expiry)
      const expiresAt = token.expiresAt as number;
      if (expiresAt && Date.now() < expiresAt * 1000) {
        return token;
      }

      // Regenerate the backend token when it expires
      // The backend token is generated from user info, so we can regenerate it
      if (token.sub && token.email) {
        try {
          const newBackendToken = generateBackendToken({
            id: token.sub as string,
            email: token.email as string,
            name: (token.name as string) || "",
          });

          return {
            ...token,
            accessToken: newBackendToken,
            backendToken: newBackendToken,
            expiresAt: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
          };
        } catch (error) {
          console.error("Failed to regenerate backend token:", error);
        }
      }

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
    async redirect({ url, baseUrl }) {
      // Handle relative URLs
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      // Handle same-origin URLs
      try {
        const urlObj = new URL(url);
        if (urlObj.origin === new URL(baseUrl).origin) {
          return url;
        }

        // Allow additional trusted origins
        const trustedHosts = [
          new URL(baseUrl).host,
          process.env.NEXTAUTH_URL
            ? new URL(process.env.NEXTAUTH_URL).host
            : null,
          process.env.NEXT_PUBLIC_APP_URL
            ? new URL(process.env.NEXT_PUBLIC_APP_URL).host
            : null,
          // Allow both production domains
          "refleckt.vercel.app",
          "reflect.ericgitangu.com",
        ].filter(Boolean) as string[];

        if (trustedHosts.includes(urlObj.host)) {
          return url;
        }
      } catch (e) {
        console.error("Error parsing redirect URL:", e);
      }

      return baseUrl;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

