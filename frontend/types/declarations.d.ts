// Type declarations for libraries

declare module "axios" {
  export interface AxiosRequestConfig {
    url?: string;
    method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    baseURL?: string;
    headers?: Record<string, string>;
    params?: any;
    data?: any;
    timeout?: number;
    withCredentials?: boolean;
    responseType?: "json" | "text" | "blob" | "arraybuffer";
    [key: string]: any;
  }

  export interface AxiosResponse<T = any> {
    data: T;
    status: number;
    statusText: string;
    headers: Record<string, string>;
    config: AxiosRequestConfig;
  }

  export interface AxiosError<T = any> extends Error {
    config: AxiosRequestConfig;
    code?: string;
    request?: any;
    response?: AxiosResponse<T>;
    isAxiosError: boolean;
  }

  export function isAxiosError(error: any): error is AxiosError;
  export function create(config?: AxiosRequestConfig): AxiosInstance;
  export function get<T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>>;
  export function post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>>;
  export function put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>>;
  export function del<T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>>;

  export interface AxiosInstance {
    (config: AxiosRequestConfig): Promise<AxiosResponse>;
    (url: string, config?: AxiosRequestConfig): Promise<AxiosResponse>;
    get<T = any>(
      url: string,
      config?: AxiosRequestConfig,
    ): Promise<AxiosResponse<T>>;
    post<T = any>(
      url: string,
      data?: any,
      config?: AxiosRequestConfig,
    ): Promise<AxiosResponse<T>>;
    put<T = any>(
      url: string,
      data?: any,
      config?: AxiosRequestConfig,
    ): Promise<AxiosResponse<T>>;
    delete<T = any>(
      url: string,
      config?: AxiosRequestConfig,
    ): Promise<AxiosResponse<T>>;
  }

  const axios: AxiosInstance & {
    create: (config?: AxiosRequestConfig) => AxiosInstance;
    isAxiosError: (error: any) => error is AxiosError;
    all: <T>(values: (Promise<T> | T)[]) => Promise<T[]>;
  };

  export default axios;
}

declare module "next-auth" {
  import { NextApiRequest, NextApiResponse } from "next";

  export interface Session {
    expires: string;
    user?: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      [key: string]: any;
    };
    [key: string]: any;
  }

  export interface JWT {
    [key: string]: any;
  }

  export interface NextAuthOptions {
    providers: any[];
    callbacks?: {
      signIn?: (params: {
        user: any;
        account: any;
        profile: any;
        email?: any;
        credentials?: any;
      }) => Promise<boolean | string> | boolean | string;
      redirect?: (params: {
        url: string;
        baseUrl: string;
      }) => Promise<string> | string;
      session?: (params: {
        session: any;
        user?: any;
        token?: any;
      }) => Promise<any> | any;
      jwt?: (params: {
        token: any;
        user?: any;
        account?: any;
        profile?: any;
        isNewUser?: boolean;
      }) => Promise<any> | any;
    };
    pages?: {
      signIn?: string;
      signOut?: string;
      error?: string;
      verifyRequest?: string;
      newUser?: string;
    };
    session?: {
      strategy?: "jwt" | "database";
      maxAge?: number;
      updateAge?: number;
    };
    secret?: string;
    [key: string]: any;
  }

  export default function NextAuth(
    req: NextApiRequest,
    res: NextApiResponse,
    options: NextAuthOptions,
  ): Promise<void>;
  export default function NextAuth(options: NextAuthOptions): any;
}

declare module "next-auth/react" {
  import { Session } from "next-auth";

  export interface SignInOptions {
    redirect?: boolean;
    callbackUrl?: string;
    [key: string]: any;
  }

  export interface SignOutOptions {
    redirect?: boolean;
    callbackUrl?: string;
  }

  export function signIn(
    provider?: string,
    options?: SignInOptions,
    authorizationParams?: any,
  ): Promise<any>;
  export function signOut(options?: SignOutOptions): Promise<void>;
  export function useSession(): {
    data: Session | null;
    status: "loading" | "authenticated" | "unauthenticated";
  };
  export function getSession(options?: { req?: any }): Promise<Session | null>;
}

declare module "next-auth/providers/credentials" {
  export default function Credentials(options: {
    name: string;
    credentials: Record<
      string,
      { label: string; type: string; [key: string]: any }
    >;
    authorize: (
      credentials: Record<string, string> | undefined,
    ) => Promise<any> | any;
  }): any;
}

declare module "next/server" {
  export class NextResponse extends Response {
    constructor(body?: BodyInit | null, init?: ResponseInit);
    static json(body: any, init?: ResponseInit): NextResponse;
    static redirect(
      url: string | URL,
      init?: number | ResponseInit,
    ): NextResponse;
    static rewrite(
      destination: string | URL,
      init?: ResponseInit,
    ): NextResponse;
    static next(init?: ResponseInit): NextResponse;
  }
}

declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_API_URL: string;
    NEXTAUTH_SECRET: string;
    NEXTAUTH_URL: string;
    [key: string]: string | undefined;
  }
}
