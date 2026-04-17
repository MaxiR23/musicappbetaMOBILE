# Feature: Animated Scroll Headers

## Contexto

Las pantallas de detalle (Artist, Station, Album, Playlist, Replay) usan headers animados que responden al scroll. La imagen de fondo hace parallax, el título grande desaparece gradualmente y una top bar colapsada aparece con el nombre de la pantalla.

Se usa `react-native-reanimated` para todas las animaciones — sin `Animated` de React Native core.

---

## Referencias externas

| Tema | URL |
|---|---|
| `useAnimatedStyle` | https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedStyle |
| `useSharedValue` | https://docs.swmansion.com/react-native-reanimated/docs/core/useSharedValue |
| `interpolate` | https://docs.swmansion.com/react-native-reanimated/docs/utilities/interpolate |
| `useAnimatedScrollHandler` | https://docs.swmansion.com/react-native-reanimated/docs/scroll/useAnimatedScrollHandler |
| `Extrapolation` | https://docs.swmansion.com/react-native-reanimated/docs/utilities/interpolate#extrapolation |
| `Animated.FlatList` | https://docs.swmansion.com/react-native-reanimated/docs/core/createAnimatedComponent |
| `expo-blur BlurView` | https://docs.expo.dev/versions/latest/sdk/blur-view |
| `expo-linear-gradient` | https://docs.expo.dev/versions/latest/sdk/linear-gradient |

---

## Componentes

| Componente | Pantalla | Estilo de header |
|---|---|---|
| `AnimatedHeader` | `ArtistScreen` | Imagen full-width, título grande abajo a la izquierda |
| `AnimatedDetailHeader` | `AlbumScreen`, `PlaylistScreen`, `ReplayScreen` | Cover cuadrado centrado que se achica al scrollear |
| `StationHeroHeader` | `StationScreen` | Imagen full-width con parallax scale, título + subtítulo centrados |

---

## Patrón de animación

Ambos componentes siguen el mismo patrón:

```
scrollY (SharedValue)
  ├── heroImageStyle     → scale de la imagen (parallax al hacer overscroll)
  ├── largeTitleStyle    → opacity + translateY del título grande
  ├── collapsedHeaderStyle → opacity de la top bar colapsada
  └── fixedBackButtonStyle → opacity del botón back fijo
```

### Por qué height fijo en el header

El `ListHeaderComponent` del `FlatList` tiene **height fijo**. Animar el `height` directamente causa que el FlatList recalcule el layout en cada frame, generando un efecto de auto-scroll no deseado.

La solución es animar solo `transform: scale` sobre la imagen adentro del contenedor, manteniendo el height constante.

---

## AnimatedHeader

Usado en `ArtistScreen`.

### Animaciones

```typescript
// Parallax al hacer overscroll hacia abajo
const heroImageStyle = useAnimatedStyle(() => {
    const scale = interpolate(
        scrollY.value,
        [-200, 0],
        [1.5, 1],
        Extrapolation.CLAMP
    );
    return { transform: [{ scale }] };
});

// Título grande desaparece al scrollear
const largeTitleStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
        scrollY.value,
        [100, 200, 250],
        [1, 0.5, 0],
        Extrapolation.CLAMP
    );
    const translateY = interpolate(
        scrollY.value,
        [0, 300],
        [0, -30],
        Extrapolation.CLAMP
    );
    return { opacity, transform: [{ translateY }] };
});

// Top bar colapsada aparece tarde
const collapsedHeaderStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
        scrollY.value,
        [260, 330],
        [0, 1],
        Extrapolation.CLAMP
    );
    return { opacity };
});

// Botón back fijo desaparece justo antes de que aparezca la top bar
const fixedBackButtonStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
        scrollY.value,
        [240, 310],
        [1, 0],
        Extrapolation.CLAMP
    );
    return { opacity };
});
```

### Estructura del ListHeader

```tsx
<View style={styles.headerContainer}>
    <Animated.View style={[StyleSheet.absoluteFill, heroImageStyle]}>
        <Image source={backgroundImage} style={styles.backgroundImage} contentFit="cover" />
    </Animated.View>
    <LinearGradient
        colors={["transparent", "rgba(14, 14, 14, 0.8)", "#0e0e0e"]}
        locations={[0, 0.7, 1]}
        style={styles.gradient}
    />
    <Animated.View style={[styles.heroInfo, largeTitleStyle]}>
        <Text style={styles.artist_name}>{title}</Text>
    </Animated.View>
</View>
```

> El `listHeader` NO usa `useMemo` — las animaciones de Reanimated se manejan fuera del ciclo de React y el `useMemo` puede causar que los `useAnimatedStyle` no se apliquen correctamente dentro del memo.

---

## AnimatedDetailHeader

Usado en `AlbumScreen`, `PlaylistScreen`, `ReplayScreen`.

### Diferencia principal con AnimatedHeader

En vez de una imagen full-width, muestra un **cover cuadrado centrado** que se achica al scrollear. Soporta cover simple o mosaico 2x2 (para playlists sin cover único).

> SEE: https://docs.swmansion.com/react-native-reanimated/docs/utilities/interpolate

### Animaciones

```typescript
// Cover cuadrado se achica y desaparece al scrollear
const coverAnimatedStyle = useAnimatedStyle(() => {
    const size = interpolate(scrollY.value, [0, 200], [240, 100], Extrapolation.CLAMP);
    const opacity = interpolate(scrollY.value, [150, 220], [1, 0], Extrapolation.CLAMP);
    return { width: size, height: size, opacity };
});

// Top bar colapsada aparece
const collapsedHeaderStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [250, 290], [0, 1], Extrapolation.CLAMP);
    return { opacity };
});

// Botón back fijo desaparece
const fixedBackButtonStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [200, 240], [1, 0], Extrapolation.CLAMP);
    return { opacity };
});

// Botón menú (tres puntos) fijo desaparece
const fixedMenuButtonStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [230, 270], [1, 0], Extrapolation.CLAMP);
    return { opacity };
});
```

### Mosaico 2x2

Cuando no hay un `coverImage` único pero hay 4+ imágenes de tracks disponibles, se muestra un mosaico:

```typescript
const isMosaic = !coverImage && uniqueImages.length >= 4;
```

```tsx
{isMosaic && mosaicImages ? (
    <MosaicCover images={mosaicImages} />
) : effectiveCover ? (
    <Image source={effectiveCover} style={styles.coverImage} contentFit="cover" />
) : (
    <View style={[styles.coverImage, { backgroundColor: "#333" }]} />
)}
```

### Props exclusivas

| Prop | Tipo | Descripción |
|---|---|---|
| `coverImage` | `string \| number?` | URL o `require()` de imagen local (ej: liked-cover.png) |
| `mosaicImages` | `string[]?` | Array de URLs para el mosaico 2x2 |
| `onMenuPress` | `fn?` | Si se pasa, aparece el botón de tres puntos en la top bar y fijo |
| `ListFooterComponent` | `ReactElement?` | Footer del FlatList |
| `onEndReached` | `fn?` | Callback para paginación infinita |

### useMemo en listHeader

A diferencia de `AnimatedHeader`, acá el `listHeader` **sí usa `useMemo`** porque `coverAnimatedStyle` viene de `interpolate` sobre `scrollY` (SharedValue de Reanimated) y se actualiza en el hilo de UI sin pasar por React. El memo evita re-renders innecesarios del cover al cambiar otros estados de la pantalla.

```typescript
const listHeader = useMemo(() => (
    <View style={styles.heroSpace}>
        <Animated.View style={[styles.coverContainer, coverAnimatedStyle]}>
            {/* cover o mosaico */}
        </Animated.View>
    </View>
), [coverImage, mosaicImages, isMosaic]);
```

---

## StationHeroHeader

Usado en `StationScreen`.

### Diferencias con los otros headers

| | AnimatedHeader | AnimatedDetailHeader | StationHeroHeader |
|---|---|---|---|
| Imagen | Full-width fija | Cover cuadrado centrado | Full-width fija |
| Título | Abajo a la izquierda, grande | No (va en sección aparte) | Centrado, con subtítulo |
| Top bar | Aparece en scroll `260–330` | Aparece en scroll `250–290` | Aparece al llegar al final del hero |
| Mosaico | No | Sí (2x2) | No |
| Menú (3 puntos) | No | Sí (opcional) | No |

### Animaciones

```typescript
// Parallax al overscroll
const heroImageStyle = useAnimatedStyle(() => {
    const scale = interpolate(
        scrollY.value,
        [-200, 0],
        [1.5, 1],
        Extrapolation.CLAMP
    );
    return { transform: [{ scale }] };
});

// Top bar aparece al llegar al final del hero
const collapsedHeaderStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
        scrollY.value,
        [HERO_HEIGHT - 80, HERO_HEIGHT - 20],
        [0, 1],
        Extrapolation.CLAMP
    );
    return { opacity };
});

// Botón back desaparece antes de que aparezca la top bar
const fixedBackButtonStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
        scrollY.value,
        [HERO_HEIGHT - 120, HERO_HEIGHT - 60],
        [1, 0],
        Extrapolation.CLAMP
    );
    return { opacity };
});
```

---

## Props compartidas

| Prop | Tipo | Descripción |
|---|---|---|
| `backgroundImage` | `string` | URL de la imagen de fondo |
| `dominantColor` | `string?` | Color dominante extraído con `useImageDominantColor`. Si se pasa, la top bar usa ese color. Si no, usa `BlurView` |
| `title` | `string` | Título colapsado en la top bar |
| `sections` | `any[]` | Secciones para el `FlatList` |
| `renderSection` | `fn` | Render de cada sección |
| `onBackPress` | `fn?` | Callback del botón back |
| `contentContainerStyle` | `any?` | Estilos extra para el `FlatList` |

---

## Decisiones de diseño

| Decisión | Razón |
|---|---|
| Height fijo en header, scale en imagen | Evita el auto-scroll causado por animar el height del `ListHeaderComponent` |
| Sin `useMemo` en `listHeader` | Los `useAnimatedStyle` dentro de un `useMemo` pueden no actualizarse correctamente |
| `dominantColor` para la top bar | Coherencia visual con el color de la imagen. Si no está disponible, cae a `BlurView` como fallback |
| Botón back fijo fuera del scroll | Siempre accesible mientras el hero es visible, desaparece cuando aparece la top bar con su propio back |

---

## Pendiente

| Qué | Detalle |
|---|---|
| Unificar `AnimatedHeader` y `StationHeroHeader` | Tienen lógica muy similar. Se podría tener un solo componente con props para controlar el estilo del título |
| Parallax hacia abajo al scrollear | Actualmente solo hay parallax en overscroll. Se podría agregar un efecto sutil al scrollear hacia abajo también |