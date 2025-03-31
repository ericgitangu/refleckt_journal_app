"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Github, Twitter, Linkedin, Mail, Globe } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t bg-background py-6 mt-auto">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
          {/* Logo and app name */}
          <div className="flex items-center gap-2">
            <div className="relative w-8 h-8">
              <Image 
                src="/logo.jpg" 
                alt="Refleckt Journal" 
                className="rounded-md"
                width={32}
                height={32}
                priority
              />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              Refleckt Journal
            </span>
          </div>
          
          {/* Social links */}
          <div className="flex items-center gap-5 sm:gap-6 text-muted-foreground">
            <Link href="mailto:developer.ericgitangu@gmail.com" aria-label="Email" className="hover:text-foreground transition flex items-center gap-1.5 group">
              <Mail className="h-4 w-4 group-hover:text-primary transition-colors" />
              <span className="hidden sm:inline text-sm">Email</span>
            </Link>
            <Link href="https://twitter.com/dev_ericgitangu" target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="hover:text-foreground transition flex items-center gap-1.5 group">
              <Twitter className="h-4 w-4 group-hover:text-primary transition-colors" />
              <span className="hidden sm:inline text-sm">Twitter</span>
            </Link>
            <Link href="https://github.com/ericgitangu" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="hover:text-foreground transition flex items-center gap-1.5 group">
              <Github className="h-4 w-4 group-hover:text-primary transition-colors" />
              <span className="hidden sm:inline text-sm">GitHub</span>
            </Link>
            <Link href="https://linkedin.com/in/ericgitangu" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="hover:text-foreground transition flex items-center gap-1.5 group">
              <Linkedin className="h-4 w-4 group-hover:text-primary transition-colors" />
              <span className="hidden sm:inline text-sm">LinkedIn</span>
            </Link>
            <Link href="https://developer.ericgitangu.com" target="_blank" rel="noopener noreferrer" aria-label="Website" className="hover:text-foreground transition flex items-center gap-1.5 group">
              <Globe className="h-4 w-4 group-hover:text-primary transition-colors" />
              <span className="hidden sm:inline text-sm">Website</span>
            </Link>
          </div>
          
          {/* Copyright */}
          <div className="text-xs text-muted-foreground font-medium">
            &copy; {currentYear} Refleckt Journal
          </div>
        </div>
      </div>
    </footer>
  );
} 