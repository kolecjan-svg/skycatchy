"use client";

import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabaseExternal as supabase } from "@/lib/supabase/external-client";
import { useAuth } from "./useAuth";

const LOCAL_KEY = "skycatchy-wishlist";

interface WishlistCtx {
  wishlistIds: string[];
  toggleWishlist: (dealId: string) => void;
}

const WishlistContext = createContext<WishlistCtx>({
  wishlistIds: [],
  toggleWishlist: () => {},
});

function readLocal(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeLocal(ids: string[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(ids));
}

function clearLocal() {
  localStorage.removeItem(LOCAL_KEY);
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [ids, setIds] = useState<string[]>([]);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    if (user) {
      supabase
        .from("wishlists")
        .select("deal_id")
        .eq("user_id", user.id)
        .then(({ data }) => {
          const dbIds = data?.map((r) => r.deal_id) ?? [];
          const local = readLocal();

          if (local.length > 0) {
            const merged = Array.from(new Set([...dbIds, ...local]));
            const toInsert = local.filter((id) => !dbIds.includes(id));
            if (toInsert.length > 0) {
              supabase
                .from("wishlists")
                .upsert(
                  toInsert.map((deal_id) => ({ user_id: user.id, deal_id })),
                  { onConflict: "user_id,deal_id" },
                )
                .then(() => {
                  clearLocal();
                  setIds(merged);
                  setSynced(true);
                });
              return;
            }
            clearLocal();
            setIds(merged);
          } else {
            setIds(dbIds);
          }
          setSynced(true);
        });
    } else {
      setIds(readLocal());
      setSynced(true);
    }
  }, [user]);

  const toggleWishlist = useCallback(
    (dealId: string) => {
      setIds((prev) => {
        const exists = prev.includes(dealId);
        const next = exists ? prev.filter((id) => id !== dealId) : [...prev, dealId];

        if (user) {
          if (exists) {
            supabase
              .from("wishlists")
              .delete()
              .eq("user_id", user.id)
              .eq("deal_id", dealId)
              .then(({ error }) => {
                if (error) {
                  toast.error("Something went wrong");
                  setIds((c) => [...c, dealId]);
                }
              });
          } else {
            supabase
              .from("wishlists")
              .insert({ user_id: user.id, deal_id: dealId })
              .then(({ error }) => {
                if (error) {
                  toast.error("Something went wrong");
                  setIds((c) => c.filter((id) => id !== dealId));
                }
              });
          }
        } else {
          writeLocal(next);
        }

        toast.success(exists ? "Removed from favorites" : "Saved to favorites");
        return next;
      });

      queryClient.invalidateQueries({ queryKey: ["wishlist-deals"] });
    },
    [user, queryClient],
  );

  return (
    <WishlistContext.Provider value={{ wishlistIds: ids, toggleWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => useContext(WishlistContext);
