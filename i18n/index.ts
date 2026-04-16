import { getLocales } from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import esAlbum from "./locales/es/album.json";
import esArtist from "./locales/es/artist.json";
import esAuth from "./locales/es/auth.json";
import esCommon from "./locales/es/common.json";
import esExplore from "./locales/es/explore.json";
import esHome from "./locales/es/home.json";
import esLibrary from "./locales/es/library.json";
import esPlayer from "./locales/es/player.json";
import esPlaylist from "./locales/es/playlist.json";
import esReplay from "./locales/es/replay.json";
import esSearch from "./locales/es/search.json";
import esStation from "./locales/es/station.json";
import esStats from "./locales/es/stats.json";

import enAlbum from "./locales/en/album.json";
import enArtist from "./locales/en/artist.json";
import enAuth from "./locales/en/auth.json";
import enCommon from "./locales/en/common.json";
import enExplore from "./locales/en/explore.json";
import enHome from "./locales/en/home.json";
import enLibrary from "./locales/en/library.json";
import enPlayer from "./locales/en/player.json";
import enPlaylist from "./locales/en/playlist.json";
import enReplay from "./locales/en/replay.json";
import enSearch from "./locales/en/search.json";
import enStation from "./locales/en/station.json";
import enStats from "./locales/en/stats.json";

const deviceLanguage = getLocales()[0]?.languageCode ?? "es";

i18n.use(initReactI18next).init({
  resources: {
    es: {
      common: esCommon,
      home: esHome,
      search: esSearch,
      album: esAlbum,
      artist: esArtist,
      playlist: esPlaylist,
      replay: esReplay,
      stats: esStats,
      station: esStation,
      library: esLibrary,
      explore: esExplore,
      player: esPlayer,
      auth: esAuth,
    },
    en: {
      common: enCommon,
      home: enHome,
      search: enSearch,
      album: enAlbum,
      artist: enArtist,
      playlist: enPlaylist,
      replay: enReplay,
      stats: enStats,
      station: enStation,
      library: enLibrary,
      explore: enExplore,
      player: enPlayer,
      auth: enAuth,
    },
  },
  lng: deviceLanguage,
  fallbackLng: "es",
  defaultNS: "common",
  interpolation: {
    escapeValue: false,
  },
  debug: false,
});

export default i18n;