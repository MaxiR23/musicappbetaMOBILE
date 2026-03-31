import { Ionicons } from "@expo/vector-icons";
import { Image, ImageStyle } from "expo-image";
import React, { ReactNode } from "react";
import {
  FlatList,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

/**
 * Props:
 * - title: Título de la sección (si showTitle=false se oculta).
 * - showTitle: Mostrar/ocultar título (default: true).
 * - titlePaddingLeft: Padding left del título (default: 8).
 *
 * - items: Lista de items a renderizar.
 *
 * - keyExtractor: Devuelve una key única por item.
 * - imageExtractor: Devuelve URL de imagen (opcional).
 * - titleExtractor: Devuelve título del item (opcional).
 * - subtitleExtractor: Devuelve subtítulo del item (opcional).
 *
 * - onItemPress: Callback al tocar un item.
 *
 * - cardWidth: Ancho de cada card (default: 140).
 * - imageHeight: Alto de la imagen (default: 140).
 * - circularImage: Imagen circular (default: false).
 * - imageBorderRadius: Border radius manual (sobrescribe circularImage si viene).
 *
 * - contentPaddingHorizontal: Padding horizontal del contenido (default: 12).
 * - gap: Separación entre items (default: 16).
 * - sectionStyle: Estilo del contenedor de la sección.
 * - titleStyle: Estilo del texto del título.
 * - subtitleStyle: Estilo del texto del subtítulo.
 * - itemContainerStyle: Estilo del contenedor de cada item.
 * - imageStyle: Estilo de la imagen.
 * - contentContainerStyle: Estilo extra para el contentContainer (FlatList).
 *
 * - titleLines: Cantidad de líneas para el título (default: 1).
 * - subtitleLines: Cantidad de líneas para el subtítulo (default: 1).
 *
 * - renderItem: Render personalizado; si se pasa, ignora los extractors.
 *
 * - initialNumToRender: Perf (FlatList) (default: 6).
 * - maxToRenderPerBatch: Perf (FlatList) (default: 6).
 * - windowSize: Perf (FlatList) (default: 5).
 * - removeClippedSubviews: Perf (FlatList) (default: true).
 *
 * - has_more: Si muestra la flechita de “ver más” a la derecha del título.
 * - onPressMore: Acción al tocar “ver más” (la navegación la decide el caller).
 */
interface HorizontalScrollSectionProps<T = any> {
  title?: string;
  showTitle?: boolean;
  titlePaddingLeft?: number;

  items: T[];

  keyExtractor: (item: T, index: number) => string;
  imageExtractor?: (item: T) => string | undefined;
  titleExtractor?: (item: T) => string | undefined;
  subtitleExtractor?: (item: T) => string | undefined;

  onItemPress?: (item: T, index: number) => void;

  cardWidth?: number;
  imageHeight?: number;
  circularImage?: boolean;
  imageBorderRadius?: number;

  contentPaddingHorizontal?: number;
  gap?: number;
  sectionStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
  itemContainerStyle?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;

  titleLines?: number;
  subtitleLines?: number;

  renderItem?: (item: T, index: number) => ReactNode;

  initialNumToRender?: number;
  maxToRenderPerBatch?: number;
  windowSize?: number;
  removeClippedSubviews?: boolean;

  has_more?: boolean;
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

  contentPaddingHorizontal = 8,
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
                    source={imageUrl}
                    style={[styles.image, { borderRadius: radius }, imageStyle]}
                    contentFit="cover"
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
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  titleTextOnly: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  card: {},
  imageContainer: {
    overflow: "hidden",
    backgroundColor: "#1a1a1a",
  },
  image: {
    width: "100%",
    height: "100%",
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