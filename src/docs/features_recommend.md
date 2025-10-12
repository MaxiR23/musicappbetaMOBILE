### FEATURED AND RECOMMED SECTION.

## Code I liked.

vars in artist page.

abajo-heroUrl

const featuredReady = !!artist?.featuredReady;
const recommendedReady = !!artist?.becauseYouLikeReady;

new section:

 {/* TODO: TESTING { */}

        {/* Featured / Recommended */}
        {(featuredReady || recommendedReady) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>For you</Text>

            <View style={styles.tilesRow}>
              {featuredReady && (
                <View style={styles.tileCol}>
                  <TouchableOpacity activeOpacity={0.9} style={styles.tileCard}>
                    {heroUrl ? (
                      <Image source={{ uri: heroUrl }} style={styles.tileBg} />
                    ) : (
                      <View style={[styles.tileBg, styles.darkBg]} />
                    )}

                    {/* Sombras sutiles */}
                    <LinearGradient colors={["rgba(0,0,0,0.45)", "transparent"]} style={styles.tileGradTop} />
                    <LinearGradient colors={["transparent", "rgba(0,0,0,0.6)"]} style={styles.tileGradBottom} />

                    {/* Pill mini abajo-izquierda */}
                    <View style={styles.tileBadgeWrap}>
                      <View style={styles.tileBadge}>
                        <Text style={styles.tileBadgeText} numberOfLines={1}>FEATURED</Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* subtítulo (2 líneas máx) */}
                  <Text style={styles.tileCaption} numberOfLines={2}>
                    Featured {artist?.header?.name}
                  </Text>
                </View>
              )}

              {recommendedReady && (
                <View style={styles.tileCol}>
                  <TouchableOpacity activeOpacity={0.9} style={styles.tileCard}>
                    {heroUrl ? (
                      <Image source={{ uri: heroUrl }} style={styles.tileBg} />
                    ) : (
                      <View style={[styles.tileBg, styles.darkBg]} />
                    )}

                    <LinearGradient colors={["rgba(0,0,0,0.45)", "transparent"]} style={styles.tileGradTop} />
                    <LinearGradient colors={["transparent", "rgba(0,0,0,0.6)"]} style={styles.tileGradBottom} />

                    <View style={styles.tileBadgeWrap}>
                      <View style={styles.tileBadge}>
                        <Text style={styles.tileBadgeText} numberOfLines={1}>RECOMMENDED</Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* subtítulo (2 líneas máx) */}
                  <Text style={styles.tileCaption} numberOfLines={2}>
                    Recommended for you
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* TODO: TESTING } */}

styles:

 // Featured / Recommended
  tilesRow: {
    flexDirection: "row",
    gap: 12,
  },
  tileCard: {
    flex: 1,
    height: 150,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#242424",
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    position: "relative",
  },
  tileBg: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  tileGradTop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "40%",
  },
  tileGradBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "45%",
  },
  // ---- label abajo-izquierda
  // ⬇️ más chica y permite que el texto fluya sin cortar
  tileBadgeWrap: {
    position: "absolute",
    left: 6,
    bottom: 6,
    right: 6,            // deja margen si el texto crece
    flexDirection: "row",
    justifyContent: "flex-start",
  },

  tileBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(0,0,0,0.42)",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
    // permite multi-línea si no entra en una
    maxWidth: "90%",
    flexShrink: 1,
    flexWrap: "wrap",
  },

  tileBadgeText: {
    color: "#fff",
    fontSize: 9,          // bien chiquita
    lineHeight: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1.5,
  },

  // columna por tile: card + caption abajo
  tileCol: {
    flex: 1,
  },

  // subtítulo debajo del tile (hasta 2 líneas)
  tileCaption: {
    marginTop: 6,
    paddingHorizontal: 2,
    color: "#cfcfcf",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    letterSpacing: 0.2,
  },