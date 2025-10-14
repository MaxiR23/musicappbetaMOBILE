// src/components/HorizontalScrollSection.tsx
import React, { ReactNode } from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

interface HorizontalScrollSectionProps {
  /**
   * Título de la sección
   */
  title: string;

  /**
   * Lista de items a mostrar
   */
  items: any[];

  /**
   * Función para extraer el ID único de cada item
   */
  keyExtractor: (item: any, index: number) => string;

  /**
   * Función para extraer la URL de la imagen
   */
  imageExtractor: (item: any) => string | undefined;

  /**
   * Función para extraer el título principal
   */
  titleExtractor: (item: any) => string;

  /**
   * Función opcional para extraer el subtítulo
   */
  subtitleExtractor?: (item: any) => string | undefined;

  /**
   * Callback al hacer tap en un item
   */
  onItemPress: (item: any, index: number) => void;

  /**
   * Ancho de cada card (default: 140)
   */
  cardWidth?: number;

  /**
   * Alto de la imagen (default: 140)
   */
  imageHeight?: number;

  /**
   * Si la imagen debe ser circular (default: false)
   */
  circularImage?: boolean;

  /**
   * Componente personalizado para renderizar cada item
   * Si se provee, ignora los extractors y usa este render
   */
  renderItem?: (item: any, index: number) => ReactNode;
}

/**
 * Componente reutilizable para secciones con scroll horizontal
 * Usado para mostrar álbumes, artistas relacionados, playlists, etc.
 * 
 * @example
 * ```tsx
 * <HorizontalScrollSection
 *   title="Álbumes"
 *   items={albums}
 *   keyExtractor={(item) => item.id}
 *   imageExtractor={(item) => item.thumbnail}
 *   titleExtractor={(item) => item.title}
 *   subtitleExtractor={(item) => item.year}
 *   onItemPress={(item) => router.push(`/album/${item.id}`)}
 * />
 * ```
 */
export default React.memo(function HorizontalScrollSection({
  title,
  items,
  keyExtractor,
  imageExtractor,
  titleExtractor,
  subtitleExtractor,
  onItemPress,
  cardWidth = 140,
  imageHeight = 140,
  circularImage = false,
  renderItem,
}: HorizontalScrollSectionProps) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      <FlatList
        horizontal
        data={items}
        keyExtractor={keyExtractor}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        initialNumToRender={4}  // ← Solo renderiza 4 al inicio
        maxToRenderPerBatch={2}  // ← Carga de a 2
        windowSize={3}  // ← Mantiene 3 ventanas en memoria
        removeClippedSubviews={true}  // ← Optimización extra
        renderItem={({ item, index }) => {
          // Si hay un render personalizado, usarlo
          if (renderItem) {
            const isLast = index === items.length - 1;
            return (
              <View style={{ marginRight: isLast ? 0 : 16 }}>
                {renderItem(item, index)}
              </View>
            );
          }

          // Render por defecto
          const isLast = index === items.length - 1;
          const imageUrl = imageExtractor(item);
          const itemTitle = titleExtractor(item);
          const subtitle = subtitleExtractor?.(item);

          return (
            <TouchableOpacity
              style={[styles.card, { width: cardWidth, marginRight: isLast ? 0 : 16 }]}
              onPress={() => onItemPress(item, index)}
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.imageContainer,
                  {
                    width: cardWidth,
                    height: imageHeight,
                    borderRadius: circularImage ? cardWidth / 2 : 8,
                  },
                ]}
              >
                {imageUrl ? (
                  <Image
                    source={{ uri: imageUrl }}
                    style={[
                      styles.image,
                      { borderRadius: circularImage ? cardWidth / 2 : 8 },
                    ]}
                  />
                ) : (
                  <View
                    style={[
                      styles.image,
                      styles.imagePlaceholder,
                      { borderRadius: circularImage ? cardWidth / 2 : 8 },
                    ]}
                  />
                )}
              </View>

              <Text
                style={styles.itemTitle}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {itemTitle}
              </Text>

              {!!subtitle && (
                <Text style={styles.subtitle} numberOfLines={1}>
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
    paddingHorizontal: 4,
    marginTop: 8,
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
  },
  scrollContent: {
    paddingRight: 0,
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