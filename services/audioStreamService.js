import { STREAM_CLIENT_NAME, STREAM_CLIENT_VERSION, STREAM_ENDPOINT } from "@/constants/config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const PLAYER_ENDPOINT = STREAM_ENDPOINT;
const VISITOR_DATA_KEY = "audio:visitorData";
const FALLBACK_VISITOR_DATA = "CgtIdHphb3VyaGNFMCjrwd3NBjIKCgJBUhIEGgAgQg%3D%3D";

// Cache en memoria
let cachedVisitorData = null;
let visitorDataLoaded = false;
const streamCache = new Map();

async function loadVisitorData() {
    if (visitorDataLoaded) return cachedVisitorData;
    try {
        const stored = await AsyncStorage.getItem(VISITOR_DATA_KEY);
        if (stored) cachedVisitorData = stored;
    } catch {}
    visitorDataLoaded = true;
    return cachedVisitorData;
}

function saveVisitorData(value) {
    if (value && value !== cachedVisitorData) {
        cachedVisitorData = value;
        AsyncStorage.setItem(VISITOR_DATA_KEY, value).catch(() => {});
    }
}

function clearVisitorData() {
    cachedVisitorData = null;
    AsyncStorage.removeItem(VISITOR_DATA_KEY).catch(() => {});
}

function getExpiry(url) {
    const match = url.match(/expire=(\d+)/);
    return match ? parseInt(match[1]) * 1000 : Date.now() + 6 * 60 * 60 * 1000;
}

async function fetchPlayer(videoId, visitorData) {
    const res = await fetch(PLAYER_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            videoId,
            context: {
                client: {
                    clientName: STREAM_CLIENT_NAME,
                    clientVersion: STREAM_CLIENT_VERSION,
                    hl: "en",
                    gl: "US",
                    visitorData: visitorData || FALLBACK_VISITOR_DATA,
                },
            },
        }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

function pickBestAudio(formats) {
  // android: ExoPlayer (usado por RNTP) soporta WebM/Opus nativamente — mayor bitrate disponible.
  // iOS: AVPlayer no soporta el contenedor WebM. Solo audio/mp4 (AAC, itag 140).
  // TODO: testear Opus/WebM en iOS 17+ — hay indicios de soporte parcial pero sin confirmación oficial.
  const candidates = Platform.OS === "android"
    ? formats.filter((f) => f.mimeType?.startsWith("audio/mp4") || f.mimeType?.startsWith("audio/webm"))
    : formats.filter((f) => f.mimeType?.startsWith("audio/mp4"));   

  const best = candidates.sort((a, b) => b.itag - a.itag)[0];

  if (!best) throw new Error("No audio stream");
  return { itag: best.itag, url: best.url, mimeType: best.mimeType, bitrate: best.bitrate, audioQuality: best.audioQuality };
}

export async function resolveAudioStream(videoId) {
    // cache hit?
    const cached = streamCache.get(videoId);
    if (cached && cached.expiresAt > Date.now()) {
        return { stream: cached.stream };
    }

    // cargar visitorData guardado
    const visitorData = await loadVisitorData();

    const data = await fetchPlayer(videoId, visitorData);

    // guardar nuevo visitorData si viene
    if (data.responseContext?.visitorData) {
        saveVisitorData(data.responseContext.visitorData);
    }

    // si funciona, cachear y retornar
    if (data.streamingData) {
        const stream = pickBestAudio(data.streamingData.adaptiveFormats);
        streamCache.set(videoId, { stream, expiresAt: getExpiry(stream.url) });
        return { stream };
    }

    // si falla, limpiar visitorData y reintentar con fallback
    if (data.playabilityStatus?.status === "LOGIN_REQUIRED") {
        clearVisitorData();
        
        const retry = await fetchPlayer(videoId, FALLBACK_VISITOR_DATA);
        
        if (retry.responseContext?.visitorData) {
            saveVisitorData(retry.responseContext.visitorData);
        }
        
        if (retry.streamingData) {
            const stream = pickBestAudio(retry.streamingData.adaptiveFormats);
            streamCache.set(videoId, { stream, expiresAt: getExpiry(stream.url) });
            return { stream };
        }
        
        throw new Error(`LOGIN_REQUIRED: ${retry.playabilityStatus?.reason}`);
    }

    throw new Error(`Failed: ${data.playabilityStatus?.status}`);
}