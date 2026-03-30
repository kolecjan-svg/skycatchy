"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { Heart, LogOut, UserCircle } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { FaApple } from "react-icons/fa";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useSeoMeta } from "@/hooks/useSeoMeta";
import { supabase } from "@/lib/supabase/client";

export function Navbar() {
  useSeoMeta();
  const { user, signOut, loading } = useAuth();
  const pathname = usePathname();

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const handleAppleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <Image
            src="/logo.png"
            alt="SkyCatchy"
            width={36}
            height={36}
            className="h-9 w-9 transition-transform group-hover:scale-95 group-active:scale-90"
          />
          <span className="notranslate text-xl tracking-tight font-inter whitespace-nowrap">
            <span className="font-normal">Sky</span>
            <span className="font-bold">Catchy</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <Link
            href="/wishlist"
            className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-secondary ${
              pathname === "/wishlist" ? "bg-secondary" : ""
            }`}
          >
            <Heart
              className={`h-5 w-5 ${pathname === "/wishlist" ? "fill-deal-save text-deal-save" : ""}`}
            />
          </Link>

          <LanguageSwitcher />

          {loading ? (
            <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-10 w-10 items-center justify-center rounded-full ring-2 ring-border transition-all hover:ring-primary focus-visible:outline-none focus-visible:ring-primary">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.user_metadata?.avatar_url} />
                    <AvatarFallback className="bg-secondary text-sm font-medium">
                      {user.user_metadata?.full_name?.[0] ||
                        user.email?.[0]?.toUpperCase() ||
                        "U"}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="text-muted-foreground text-xs cursor-default">
                  {user.email}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={signOut}
                  className="text-destructive cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <UserCircle className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  onClick={handleGoogleLogin}
                  className="cursor-pointer gap-2"
                >
                  <FcGoogle className="h-4 w-4" /> Continue with Google
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleAppleLogin}
                  className="cursor-pointer gap-2"
                >
                  <FaApple className="h-4 w-4" /> Continue with Apple
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>
      </div>
    </header>
  );
}
