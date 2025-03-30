import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CognitoProvider from "next-auth/providers/cognito";

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
          response_type: "code"
        }
      }
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

      // Implement token refresh for Cognito
      if (token.provider === 'cognito' && token.refreshToken) {
        try {
          const response = await fetch(`${process.env.COGNITO_ISSUER}/oauth2/token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              grant_type: 'refresh_token',
              client_id: process.env.COGNITO_CLIENT_ID || '',
              refresh_token: token.refreshToken as string,
            }),
          });
          
          const refreshedTokens = await response.json();
          
          if (!response.ok) {
            throw refreshedTokens;
          }
          
          return {
            ...token,
            accessToken: refreshedTokens.access_token,
            expiresAt: Math.floor(Date.now() / 1000 + refreshedTokens.expires_in),
          };
        } catch (error) {
          console.error('Error refreshing access token', error);
          // Return existing token even if expired as fallback
          return token;
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
          process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).host : null,
          process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).host : null,
        ].filter(Boolean) as string[];
        
        if (trustedHosts.includes(urlObj.host)) {
          return url;
        }
      } catch (e) {
        console.error('Error parsing redirect URL:', e);
      }
      
      return baseUrl;
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
}; 