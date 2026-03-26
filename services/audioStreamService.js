import { STREAM_CLIENT_NAME, STREAM_CLIENT_VERSION, STREAM_ENDPOINT } from "@/constants/config";
import { deleteExpiredStreams, getStream, upsertStream } from "@/lib/streamCacheDb";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const PLAYER_ENDPOINT = STREAM_ENDPOINT;
const VISITOR_DATA_KEY = "audio:visitorData";
const FALLBACK_VISITOR_DATA = "CgtIdHphb3VyaGNFMCjrwd3NBjIKCgJBUhIEGgAgQg%3D%3D";

let cachedVisitorData = null;
let visitorDataLoaded = false;

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
    const candidates = Platform.OS === "android"
        ? formats.filter((f) => f.mimeType?.startsWith("audio/mp4") || f.mimeType?.startsWith("audio/webm"))
        : formats.filter((f) => f.mimeType?.startsWith("audio/mp4"));

    const best = candidates.sort((a, b) => b.bitrate - a.bitrate)[0];
    if (!best) throw new Error("No audio stream");
    return { url: best.url, mimeType: best.mimeType, bitrate: best.bitrate };
}

export async function resolveAudioStream(videoId) {
    // cache hit en SQLite
    const cached = await getStream(videoId);
    if (cached) {
        return { stream: { url: cached.url, mimeType: cached.mime_type, bitrate: cached.bitrate } };
    }

    const visitorData = await loadVisitorData();
    const data = await fetchPlayer(videoId, visitorData);

    if (data.responseContext?.visitorData) {
        saveVisitorData(data.responseContext.visitorData);
    }

    if (data.streamingData) {
        const stream = pickBestAudio(data.streamingData.adaptiveFormats);
        await upsertStream({
            video_id: videoId,
            url: stream.url,
            mime_type: stream.mimeType,
            bitrate: stream.bitrate,
            expires_at: getExpiry(stream.url),
        });
        return { stream };
    }

    if (data.playabilityStatus?.status === "LOGIN_REQUIRED") {
        clearVisitorData();

        const retry = await fetchPlayer(videoId, FALLBACK_VISITOR_DATA);

        if (retry.responseContext?.visitorData) {
            saveVisitorData(retry.responseContext.visitorData);
        }

        if (retry.streamingData) {
            const stream = pickBestAudio(retry.streamingData.adaptiveFormats);
            await upsertStream({
                video_id: videoId,
                url: stream.url,
                mime_type: stream.mimeType,
                bitrate: stream.bitrate,
                expires_at: getExpiry(stream.url),
            });
            return { stream };
        }

        throw new Error(`LOGIN_REQUIRED: ${retry.playabilityStatus?.reason}`);
    }

    throw new Error(`Failed: ${data.playabilityStatus?.status}`);
}

export async function purgeExpiredStreams() {
    await deleteExpiredStreams();
}