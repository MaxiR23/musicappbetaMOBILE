import { StyleSheet } from "react-native";

export const ACCENT = "#ffffff";
export const ACCENT_TEXT = "#000";

export const authStyles = StyleSheet.create({
  wrap: {
    flex: 1,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0e0e0e",
  },
  brandBox: { alignItems: "center", marginBottom: 18 },
  brandIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: ACCENT,
    letterSpacing: 0.4,
  },
  brandSubtitle: { color: "#aaa", marginTop: 6 },

  card: {
    width: "100%",
    maxWidth: 460,
    backgroundColor: "#141414",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#222",
  },
  cardTitle: { color: "#fff", fontSize: 20, fontWeight: "700" },
  cardDesc: { color: "#aaa", marginTop: 2 },

  label: { color: "#ddd", fontSize: 12, marginBottom: 6 },
  input: {
    height: 46,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: "#1b1b1b",
    color: "#fff",
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  hintText: { fontSize: 12 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#777",
  },

  error: { color: "#ff5c5c", marginTop: 10 },

  btn: {
    marginTop: 16,
    height: 46,
    borderRadius: 10,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { color: ACCENT_TEXT, fontWeight: "700" },

  switchText: { color: "#aaa", textAlign: "center", marginTop: 14 },
  switchLink: { color: ACCENT, fontWeight: "700" },

  footer: { color: "#666", fontSize: 12, marginTop: 16 },
});