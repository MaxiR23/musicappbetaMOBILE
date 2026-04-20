import { LibraryContext } from "@/context/LibraryContext";
import { useContext } from "react";

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) {
    throw new Error("useLibrary must be used within a LibraryProvider");
  }
  return ctx;
}