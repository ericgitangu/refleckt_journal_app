"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "pwa_install_dismissed";
const DISMISSED_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  // Check if app is already installed
  useEffect(() => {
    // Check if running as PWA
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const isIOSPWA = (window.navigator as { standalone?: boolean }).standalone;

    if (isStandalone || isIOSPWA) {
      setIsInstalled(true);
      return;
    }

    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // Check if dismissed recently
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      if (Date.now() - dismissedTime < DISMISSED_DURATION) {
        return;
      }
    }

    // For iOS, show custom prompt after delay
    if (isIOSDevice) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Listen for beforeinstallprompt event (Chrome, Edge, etc.)
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Show prompt after a delay
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    setIsInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        setIsInstalled(true);
      }
    } catch (err) {
      console.error("Installation failed:", err);
    } finally {
      setIsInstalling(false);
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
    setShowPrompt(false);
  }, []);

  // Don't show if installed or not eligible
  if (isInstalled || !showPrompt) {
    return null;
  }

  // iOS-specific instructions
  if (isIOS) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4">
        <Card className="border-2 border-primary/20 shadow-lg">
          <CardContent className="p-4">
            {showIOSInstructions ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Install on iOS</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowIOSInstructions(false)}
                    className="h-8 w-8"
                  >
                    <Icons.x className="h-4 w-4" />
                  </Button>
                </div>

                <ol className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium">
                      1
                    </span>
                    <span>
                      Tap the <strong>Share</strong> button{" "}
                      <Icons.share className="inline h-4 w-4" /> at the bottom of Safari
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium">
                      2
                    </span>
                    <span>
                      Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong>{" "}
                      <Icons.plus className="inline h-4 w-4" />
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium">
                      3
                    </span>
                    <span>
                      Tap <strong>&quot;Add&quot;</strong> to install Reflekt
                    </span>
                  </li>
                </ol>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleDismiss}
                >
                  Got it
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Icons.download className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">Install Reflekt</h3>
                  <p className="text-sm text-muted-foreground">
                    Add to your home screen for the best experience
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDismiss}
                    className="h-8 w-8"
                  >
                    <Icons.x className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowIOSInstructions(true)}
                  >
                    How to Install
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Standard install prompt for Chrome, Edge, etc.
  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4">
      <Card className="border-2 border-primary/20 shadow-lg bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Icons.download className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold">Install Reflekt Journal</h3>
              <p className="text-sm text-muted-foreground">
                Install for offline access and a native app experience
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDismiss}
                className="h-8 w-8"
              >
                <Icons.x className="h-4 w-4" />
              </Button>
              <Button
                onClick={handleInstall}
                disabled={isInstalling}
                className="gap-2"
              >
                {isInstalling ? (
                  <Icons.spinner className="h-4 w-4 animate-spin" />
                ) : (
                  <Icons.download className="h-4 w-4" />
                )}
                Install
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Hook for programmatic install trigger
export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Check if running as PWA
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const isIOSPWA = (window.navigator as { standalone?: boolean }).standalone;

    if (isStandalone || isIOSPWA) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      return outcome === "accepted";
    } catch (err) {
      console.error("Installation failed:", err);
      return false;
    }
  }, [deferredPrompt]);

  return { canInstall, isInstalled, install };
}
