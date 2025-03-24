'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { navigation, getInitials, authRoutes } from '../config/navigation.config';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Menu, X } from 'lucide-react';

export function TopNavbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-hide menu after 3 seconds if open
  useEffect(() => {
    if (menuOpen) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setMenuOpen(false);
      }, 3000);
    }
    
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [menuOpen]);

  // Handle click outside to close menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Check if current path is login, signup, or logout page
  const isAuthPage = [authRoutes.login, authRoutes.signup, authRoutes.logout].includes(pathname || '');

  // Don't show navbar on auth pages
  if (isAuthPage) return null;

  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        {/* Logo and App Name */}
        <div className="flex items-center space-x-2">
          <Link href="/" className="flex items-center space-x-2">
            <Image 
              src="/logo.jpg" 
              alt="Reflekt Logo" 
              width={28} 
              height={28} 
              className="rounded-md"
            />
            <span className="font-bold text-lg">Reflekt</span>
          </Link>
        </div>

        {/* Right-aligned items */}
        <div className="flex items-center space-x-2">
          {/* Theme Toggle */}
          <ThemeToggle />
          
          {/* Menu Toggle for authenticated users */}
          {session ? (
            <div className="relative" ref={menuRef}>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setMenuOpen(!menuOpen)}
                className="relative"
              >
                {menuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
              
              {/* Mobile Navigation Menu */}
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-popover border border-border overflow-hidden">
                  <div className="p-2">
                    <div className="flex flex-col space-y-1 p-2">
                      <p className="text-sm font-medium leading-none">{session.user?.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{session.user?.email}</p>
                    </div>
                    <div className="h-px bg-border my-1" />
                    {navigation
                      .filter(item => item.showInNav)
                      .map(item => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            'flex items-center space-x-2 w-full px-2 py-1.5 text-sm rounded-md',
                            pathname === item.href
                              ? 'bg-accent text-accent-foreground'
                              : 'hover:bg-accent/50'
                          )}
                          onClick={() => setMenuOpen(false)}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      ))}
                    <div className="h-px bg-border my-1" />
                    <Link 
                      href="/settings" 
                      className="flex items-center space-x-2 w-full px-2 py-1.5 text-sm rounded-md hover:bg-accent/50"
                      onClick={() => setMenuOpen(false)}
                    >
                      Settings
                    </Link>
                    <button 
                      className="flex items-center space-x-2 w-full px-2 py-1.5 text-sm rounded-md text-red-600 hover:bg-red-100/20"
                      onClick={() => {
                        setMenuOpen(false);
                        signOut();
                      }}
                    >
                      Log out
                    </button>
                  </div>
                </div>
              )}
              
              {/* User Avatar */}
              <Avatar className="h-8 w-8 ml-2">
                <AvatarImage
                  src={session.user?.image || undefined}
                  alt={session.user?.name || ''}
                />
                <AvatarFallback>
                  {getInitials(session.user?.name || '')}
                </AvatarFallback>
              </Avatar>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Button variant="ghost" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Get Started</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
} 