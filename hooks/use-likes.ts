import { LikesContext, LikesContextType } from "@/context/LikesContext";
import { useContext } from "react";

export function useLikes(): LikesContextType {
  const ctx = useContext(LikesContext);
  if (!ctx) {
    throw new Error("useLikes must be used within a LikesProvider");
  }
  return ctx;
}