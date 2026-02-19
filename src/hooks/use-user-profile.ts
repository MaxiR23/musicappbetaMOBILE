import { supabase } from '@/src/lib/supabase';
import { getInitials, pickGradient } from '@/src/utils/avatar';
import { useEffect, useMemo, useState } from 'react';

export function useUserProfile() {
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const u = data.session?.user;
      setUserId(u?.id ?? "");
      setUserName(
        (u?.user_metadata?.display_name ||
          u?.user_metadata?.name ||
          u?.user_metadata?.full_name ||
          "") as string
      );
      setUserEmail((u?.email ?? u?.user_metadata?.email ?? "") as string);
    })();
  }, []);

  const initials = useMemo(
    () => getInitials(userName || userEmail || "Usuario"),
    [userName, userEmail]
  );

  const gradient = useMemo(
    () => pickGradient(userId || userEmail || userName || "seed"),
    [userId, userEmail, userName]
  );

  return {
    userName,
    userEmail,
    userId,
    initials,
    gradient,
  };
}