import CreatePlaylistModal from "@/components/shared/CreatePlaylistModal";
import LoadingView from "@/components/shared/LoadingView";
import ReleaseCard from "@/components/shared/ReleaseCard";
import ScreenHeader from "@/components/shared/ScreenHeader";
import { useContentPadding } from "@/hooks/use-content-padding";
import { useLibraryView } from "@/hooks/use-library-view";
import { useUserProfile } from "@/hooks/use-user-profile";
import { LibraryViewItem } from "@/services/libraryService";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, StatusBar, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Item sintetico para el boton "+ crear playlist".
type CreateButtonItem = { __type: "create_button"; id: "__create__" };
type GridItem = LibraryViewItem | CreateButtonItem;

function isCreateButton(item: GridItem): item is CreateButtonItem {
  return (item as CreateButtonItem).__type === "create_button";
}

export default function LibraryScreen() {
  const router = useRouter();
  const { userId } = useUserProfile();
  const insets = useSafeAreaInsets();
  const [createOpen, setCreateOpen] = useState(false);
  const contentPadding = useContentPadding();
  const { t } = useTranslation("library");

  const { viewItems, isReady } = useLibraryView();

  // La grilla del backend ya viene ordenada: liked primero, despues resto por sorted_at.
  // Solo sumamos el boton de "crear" al final (o donde prefieras).
  const data = useMemo<GridItem[]>(
    () => [...viewItems, { __type: "create_button", id: "__create__" }],
    [viewItems],
  );

  const renderItem = useCallback(
    ({ item }: { item: GridItem }) => {
      if (isCreateButton(item)) {
        // Si ya tenes un componente para esto, cambialo. Placeholder por ahora:
        return null;
      }

      switch (item.kind) {
        case "liked":
          return (
            <ReleaseCard
              cover={require("@/assets/images/liked-cover.png")}
              title={t("liked")}
              subtitle={item.subtitle}
              onPress={() => router.push("/(tabs)/library/playlist/liked")}
            />
          );

        case "own_playlist":
          return (
            <ReleaseCard
              cover={item.thumbnail_url || null}
              thumbnails={item.thumbnail_urls}
              title={item.title || t("untitled")}
              onPress={() =>
                router.push(`/(tabs)/library/playlist/${encodeURIComponent(item.id)}`)
              }
            />
          );

        case "saved_album":
          return (
            <ReleaseCard
              cover={item.thumbnail_url || null}
              title={item.title}
              subtitle={item.subtitle}
              onPress={() =>
                router.push(`/(tabs)/library/album/${encodeURIComponent(item.id)}`)
              }
            />
          );

        case "saved_playlist":
          return (
            <ReleaseCard
              cover={item.thumbnail_url || null}
              title={item.title}
              subtitle={item.subtitle}
              onPress={() =>
                router.push(`/(tabs)/library/playlist/${encodeURIComponent(item.id)}`)
              }
            />
          );

        default:
          return null;
      }
    },
    [router, t],
  );

  const keyExtractor = useCallback((item: GridItem) => {
    if (isCreateButton(item)) return "__create__";
    return `${item.kind}:${item.id}`;
  }, []);

  if (!userId || !isReady) {
    return <LoadingView />;
  }

  return (
    <>
      <StatusBar barStyle="light-content" />
      <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
        <ScreenHeader
          title={t("header")}
          rightContent={
            <TouchableOpacity
              onPress={() => setCreateOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={t("create_playlist")}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              style={styles.headerAction}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={26} color="#fff" />
            </TouchableOpacity>
          }
        />

        <FlatList
          data={data}
          keyExtractor={keyExtractor}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, justifyContent: "space-between" }}
          contentContainerStyle={[
            { padding: 12, gap: 12 },
            contentPadding,
          ]}
          renderItem={renderItem}
          removeClippedSubviews={true}
          initialNumToRender={20}
          maxToRenderPerBatch={10}
          windowSize={5}
        />
      </View>

      <CreatePlaylistModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        // El provider escucha onPlaylistChange internamente, no hace falta pasarle callback.
        // Si tu modal requiere el prop, pasale () => {} o sacá el prop del modal.
        onCreated={() => { }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0e0e0e",
  },
  headerAction: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
});