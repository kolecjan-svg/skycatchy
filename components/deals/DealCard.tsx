"use client";

import React, { useState, useRef, useEffect } from "react";
import { Heart, ArrowRight, Share2, Copy, Mail, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { formatDealTime } from "@/lib/formatDealTime";
import { useWishlist } from "@/hooks/useWishlist";
import { useUiTranslations } from "@/hooks/useUiTranslations";
import { useLanguage } from "@/hooks/useLanguage";
import { useSessionStart } from "@/hooks/useSessionStart";
import { useLastVisit } from "@/hooks/useLastVisit";

export interface Deal {
  id: string;
  created_at: string;
  name: string;
  description: string | null;
  link: string | null;
  source: string | null;
  image: string | null;
  is_relevant?: boolean;
}

interface DealCardProps {
  deal: Deal;
  index?: number;
}

export const DealCard = React.memo(function DealCard({ deal, index = 0 }: DealCardProps) {
  const { wishlistIds, toggleWishlist } = useWishlist();
  const { t } = useUiTranslations();
  const { language } = useLanguage();
  const sessionStart = useSessionStart();
  const lastVisit = useLastVisit();
  const [shareOpen, setShareOpen] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  const isNewDuringSession = new Date(deal.created_at).getTime() > sessionStart;
  const isNewSinceLastVisit = lastVisit > 0 && new Date(deal.created_at).getTime() > lastVisit;

  useEffect(() => {
    if (!shareOpen) return;
    const handler = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShareOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [shareOpen]);

  if (!deal?.id) return null;

  const isSaved = wishlistIds.includes(deal.id);
  const shareUrl = deal.link || `${typeof window !== "undefined" ? window.location.origin : ""}/deal/${deal.id}`;
  const shareTitle = deal.name || "";

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const canNativeShare =
      typeof navigator.share === "function" &&
      (window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0);
    if (canNativeShare) {
      await navigator.share({ title: shareTitle, url: shareUrl });
      return;
    }
    setShareOpen((prev) => !prev);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => toast.success(t("link_copied")));
    setShareOpen(false);
  };

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-xl bg-card shadow-sm ring-1 transition-shadow hover:shadow-lg animate-reveal-up ${
        isNewDuringSession
          ? "ring-2 ring-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20"
          : "ring-border"
      }`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {deal.image && (
        <div className="aspect-video w-full overflow-hidden">
          <img
            src={deal.image}
            alt={deal.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      )}

      {isNewSinceLastVisit && !isNewDuringSession && (
        <span className="absolute left-3 top-3 z-10 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm">
          {t("new_badge")}
        </span>
      )}

      <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
        <div ref={shareRef} className="relative">
          <button
            onClick={handleShare}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-card/80 backdrop-blur-sm transition-transform hover:scale-110 active:scale-95"
            aria-label="Share deal"
          >
            <Share2 className="h-4 w-4 text-foreground/70" />
          </button>

          {shareOpen && (
            <div className="absolute right-0 top-11 z-20 w-44 rounded-lg bg-popover p-1 shadow-lg ring-1 ring-border animate-in fade-in-0 zoom-in-95">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareTitle + " " + shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShareOpen(false)}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShareOpen(false)}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
                Facebook
              </a>
              <a
                href={`mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(shareUrl)}`}
                onClick={() => setShareOpen(false)}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                <Mail className="h-4 w-4" /> Email
              </a>
              <div className="my-1 border-t border-border" />
              <button
                onClick={copyLink}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                <Copy className="h-4 w-4" /> {t("copy_link")}
              </button>
            </div>
          )}
        </div>

        <button
          onClick={(e) => {
            e.preventDefault();
            toggleWishlist(deal.id);
          }}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-card/80 backdrop-blur-sm transition-transform hover:scale-110 active:scale-95"
          aria-label={isSaved ? t("remove_from_favorites") : t("save_to_favorites")}
        >
          <Heart
            className={`h-5 w-5 transition-colors ${
              isSaved ? "fill-deal-save text-deal-save" : "text-foreground/70"
            }`}
          />
        </button>
      </div>

      <div className={`flex flex-1 flex-col gap-2 p-4 ${deal.image ? "" : "pt-14"}`}>
        <h3 className="font-semibold leading-snug line-clamp-2">{deal.name}</h3>
        {deal.description && (
          <p className="text-sm text-muted-foreground line-clamp-3">{deal.description}</p>
        )}
        <div className="mt-auto flex items-end justify-between pt-2 border-t border-border">
          <div className="flex flex-col gap-0.5">
            {deal.source && (
              <span className="notranslate text-xs text-muted-foreground">{deal.source}</span>
            )}
            <span className="text-[11px] text-muted-foreground/60">
              {formatDealTime(deal.created_at, language)}
            </span>
          </div>
          {deal.link && (
            <a
              href={deal.link}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
            >
              {t("view_deal")} <ArrowRight className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
});
