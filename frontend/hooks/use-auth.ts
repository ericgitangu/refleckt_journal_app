import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { Session } from '@/types/api';

export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const isAuthenticated = status === 'authenticated';
  const isSessionLoading = status === 'loading';
  
  const login = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        toast({
          title: 'Authentication failed',
          description: result.error,
          variant: 'destructive',
        });
        return false;
      }
      
      router.push('/journal');
      return true;
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: 'Authentication failed',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [router]);

  const logout = useCallback(async () => {
    try {
      setLoading(true);
      await signOut({ redirect: false });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: 'Logout failed',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [router]);

  return {
    session: session as Session | null,
    isAuthenticated,
    isLoading: loading || isSessionLoading,
    login,
    logout,
  };
} 