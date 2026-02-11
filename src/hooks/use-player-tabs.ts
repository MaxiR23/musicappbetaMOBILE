import { useEffect, useRef, useState } from 'react';

export function usePlayerTabs(currentSongId: string | undefined) {
  const [activePlayerTab, setActivePlayerTab] = useState<"upnext" | "lyrics" | "related" | null>(null);
  const skipTabCloseOnNextSongChange = useRef(false);

  useEffect(() => {
    if (skipTabCloseOnNextSongChange.current) {
      skipTabCloseOnNextSongChange.current = false;
      return;
    }

    if (activePlayerTab !== null) {
      setActivePlayerTab(null);
    }
  }, [currentSongId, activePlayerTab]);

  const handleTabChange = (tab: "upnext" | "lyrics" | "related" | null) => {
    setActivePlayerTab(tab);
  };

  const keepTabOpenOnNextChange = () => {
    skipTabCloseOnNextSongChange.current = true;
  };

  return {
    activePlayerTab,
    handleTabChange,
    keepTabOpenOnNextChange,
  };
}