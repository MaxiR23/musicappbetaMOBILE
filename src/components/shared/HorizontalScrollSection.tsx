// src/components/HorizontalScrollSection.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { ReactNode } from "react";
import {
  FlatList,
  Image,
  ImageStyle,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

interface HorizontalScrollSectionProps<T = any> {
  /** Título de la sección (ocultable con showTitle=false) */
  title?: string;
  showTitle?: boolean; // default: true
  /** Padding left del título (configurable) */
  titlePaddingLeft?: number; // default: 8

  /** Lista de items */
  items: T[];

  /** Extractores */
  keyExtractor: (item: T, index: number) => string;
  imageExtractor?: (item: T) => string | undefined;
  titleExtractor?: (item: T) => string | undefined;
  subtitleExtractor?: (item: T) => string | undefined;

  /** Tap en item */
  onItemPress?: (item: T, index: number) => void;

  /** Layout / medidas */
  cardWidth?: number;         // default: 140
  imageHeight?: number;       // default: 140
  circularImage?: boolean;    // default: false
  imageBorderRadius?: number; // sobrescribe circularImage si viene

  /** Espaciado y estilos para igualar otras pantallas */
  contentPaddingHorizontal?: number;          // default: 12 (match PlayerTabs)
  gap?: number;                                // default: 16
  sectionStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
  itemContainerStyle?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;

  /** Líneas de texto */
  titleLines?: number;    // default: 1
  subtitleLines?: number; // default: 1

  /** Render personalizado (si lo pasás, ignora extractors) */
  renderItem?: (item: T, index: number) => ReactNode;

  /** Perf knobs (pasan directo a FlatList) */
  initialNumToRender?: number;       // default: 6
  maxToRenderPerBatch?: number;      // default: 6
  windowSize?: number;               // default: 5
  removeClippedSubviews?: boolean;   // default: true

  /** Opcional: mostrar flechita a la derecha del título */
  has_more?: boolean;
  /** Opcional: acción al tocar la flechita (la navegación la decide el caller) */
  onPressMore?: () => void;
}

export default React.memo(function HorizontalScrollSection<T>({
  title,
  showTitle = true,
  titlePaddingLeft = 8,

  items,
  keyExtractor,
  imageExtractor,
  titleExtractor,
  subtitleExtractor,
  onItemPress,

  cardWidth = 140,
  imageHeight = 140,
  circularImage = false,
  imageBorderRadius,

  contentPaddingHorizontal = 8, // ← por defecto igual que tus pantallas
  gap = 16,
  sectionStyle,
  titleStyle,
  subtitleStyle,
  itemContainerStyle,
  imageStyle,
  contentContainerStyle,

  titleLines = 1,
  subtitleLines = 1,

  renderItem,

  initialNumToRender = 6,
  maxToRenderPerBatch = 6,
  windowSize = 5,
  removeClippedSubviews = true,

  has_more = false,
  onPressMore,
}: HorizontalScrollSectionProps<T>) {
  if (!items || items.length === 0) return null;

  const radius = imageBorderRadius ?? (circularImage ? cardWidth / 2 : 8);

  return (
    <View style={[styles.section, sectionStyle]}>
      {showTitle && !!title && (
        has_more ? (
          <View style={styles.titleRow}>
            <Text
              style={[styles.titleTextOnly, titleStyle]}
              numberOfLines={1}
            >
              {title}
            </Text>
            <TouchableOpacity
              onPress={onPressMore}
              disabled={!onPressMore}
              accessibilityRole="button"
              hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color="#fff"
                style={{ opacity: onPressMore ? 1 : 0.6 }}
              />
            </TouchableOpacity>
          </View>
        ) : (
          <Text
            style={[styles.title, { paddingLeft: titlePaddingLeft }, titleStyle]}
          >
            {title}
          </Text>
        )
      )}

      <FlatList
        horizontal
        data={items}
        keyExtractor={keyExtractor}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          { paddingHorizontal: contentPaddingHorizontal },
          contentContainerStyle,
        ]}
        initialNumToRender={initialNumToRender}
        maxToRenderPerBatch={maxToRenderPerBatch}
        windowSize={windowSize}
        removeClippedSubviews={removeClippedSubviews}
        renderItem={({ item, index }) => {
          if (renderItem) {
            const isLast = index === items.length - 1;
            return (
              <View style={{ marginRight: isLast ? 0 : gap }}>
                {renderItem(item, index)}
              </View>
            );
          }

          const isLast = index === items.length - 1;
          const imageUrl = imageExtractor?.(item);
          const itemTitle = titleExtractor?.(item);
          const subtitle = subtitleExtractor?.(item);

          return (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onItemPress ? () => onItemPress(item, index) : undefined}
              style={[
                styles.card,
                { width: cardWidth, marginRight: isLast ? 0 : gap },
                itemContainerStyle,
              ]}
            >
              <View
                style={[
                  styles.imageContainer,
                  { width: cardWidth, height: imageHeight, borderRadius: radius },
                ]}
              >
                {imageUrl ? (
                  <Image
                    source={{ uri: imageUrl }}
                    style={[styles.image, { borderRadius: radius }, imageStyle]}
                  />
                ) : (
                  <View
                    style={[
                      styles.image,
                      styles.imagePlaceholder,
                      { borderRadius: radius },
                    ]}
                  />
                )}
              </View>

              {!!itemTitle && (
                <Text
                  style={styles.itemTitle}
                  numberOfLines={titleLines}
                  ellipsizeMode="tail"
                >
                  {itemTitle}
                </Text>
              )}

              {!!subtitle && (
                <Text
                  style={[styles.subtitle, subtitleStyle]}
                  numberOfLines={subtitleLines}
                >
                  {subtitle}
                </Text>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    marginTop: 12,
  },
  // Camino original (se mantiene tal cual)
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  // Mismo spacing que el título original, sin duplicar padding
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  // Tipografía idéntica a 'title', sin margin/padding
  titleTextOnly: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  card: {
    // ancho dinámico por prop
  },
  imageContainer: {
    overflow: "hidden",
    backgroundColor: "#1a1a1a",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  imagePlaceholder: {
    backgroundColor: "#333",
  },
  itemTitle: {
    color: "#fff",
    fontWeight: "600",
    marginTop: 6,
  },
  subtitle: {
    color: "#aaa",
    fontSize: 12,
    marginTop: 2,
  },
});