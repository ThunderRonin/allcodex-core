import escapeHtml from "escape-html";

interface ThemeSongEmbed {
    provider: "spotify" | "youtube" | "soundcloud" | "appleMusic";
    providerLabel: string;
    sourceUrl: string;
    embedUrl: string;
    height: number;
}

const SPOTIFY_ENTITY_TYPES = new Set(["track", "album", "playlist", "artist", "episode", "show"]);
const YOUTUBE_HOSTS = new Set([
    "youtube.com",
    "www.youtube.com",
    "music.youtube.com",
    "m.youtube.com",
    "youtu.be",
    "youtube-nocookie.com",
    "www.youtube-nocookie.com"
]);
const SOUNDCLOUD_HOSTS = new Set(["soundcloud.com", "www.soundcloud.com"]);
const APPLE_MUSIC_HOSTS = new Set(["music.apple.com", "embed.music.apple.com"]);

export function renderThemeSongBlock(rawValue: string | null | undefined, noteTitle: string): string | null {
    const themeSong = parseThemeSongUrl(rawValue);
    if (!themeSong) {
        return null;
    }

    const safeTitle = escapeHtml(`${noteTitle} theme song`);
    const safeProvider = escapeHtml(themeSong.providerLabel);
    const safeExternalUrl = escapeHtml(themeSong.sourceUrl);
    const safeEmbedUrl = escapeHtml(themeSong.embedUrl);

    return `<section class="theme-song-card">
<p class="theme-song-kicker">Theme song</p>
<p class="theme-song-provider">${safeProvider}</p>
<iframe class="theme-song-embed" title="${safeTitle}" src="${safeEmbedUrl}" height="${themeSong.height}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>
<p class="theme-song-link"><a href="${safeExternalUrl}" target="_blank" rel="noopener noreferrer">Open on provider</a></p>
</section>`;
}

function parseThemeSongUrl(rawValue: string | null | undefined): ThemeSongEmbed | null {
    const candidate = normalizeThemeSongCandidate(rawValue);
    if (!candidate) {
        return null;
    }

    let url: URL;
    try {
        url = new URL(candidate);
    } catch {
        return null;
    }

    if (url.protocol !== "https:") {
        return null;
    }

    const hostname = url.hostname.toLowerCase();

    if (hostname === "open.spotify.com") {
        return parseSpotifyUrl(url);
    }

    if (YOUTUBE_HOSTS.has(hostname)) {
        return parseYouTubeUrl(url);
    }

    if (SOUNDCLOUD_HOSTS.has(hostname)) {
        return parseSoundCloudUrl(url);
    }

    if (APPLE_MUSIC_HOSTS.has(hostname)) {
        return parseAppleMusicUrl(url);
    }

    return null;
}

function normalizeThemeSongCandidate(rawValue: string | null | undefined): string | null {
    const trimmed = rawValue?.trim();
    if (!trimmed) {
        return null;
    }

    if (!trimmed.includes("<") && !trimmed.includes(">")) {
        return trimmed;
    }

    return extractIframeSrc(trimmed);
}

function extractIframeSrc(rawValue: string): string | null {
    if (!/^\s*<iframe\b[\s\S]*<\/iframe>\s*$/i.test(rawValue)) {
        return null;
    }

    const srcMatch = rawValue.match(/\bsrc\s*=\s*(["'])(.*?)\1/i);
    const src = srcMatch?.[2]?.trim();
    return src || null;
}

function parseSpotifyUrl(url: URL): ThemeSongEmbed | null {
    const pathParts = url.pathname.split("/").filter(Boolean);
    if (pathParts[0] === "embed") {
        pathParts.shift();
    }

    const [entityType, entityId] = pathParts;
    if (!entityType || !entityId || !SPOTIFY_ENTITY_TYPES.has(entityType)) {
        return null;
    }

    return {
        provider: "spotify",
        providerLabel: "Spotify",
        sourceUrl: `https://open.spotify.com/${entityType}/${entityId}`,
        embedUrl: `https://open.spotify.com/embed/${entityType}/${entityId}`,
        height: entityType === "track" || entityType === "episode" ? 152 : 352
    };
}

function parseYouTubeUrl(url: URL): ThemeSongEmbed | null {
    let videoId: string | null = null;

    if (url.hostname.toLowerCase() === "youtu.be") {
        videoId = url.pathname.split("/").filter(Boolean)[0] ?? null;
    } else if (url.pathname.startsWith("/embed/")) {
        videoId = url.pathname.split("/").filter(Boolean)[1] ?? null;
    } else {
        videoId = url.searchParams.get("v");
    }

    if (!videoId) {
        return null;
    }

    const sourceHost = url.hostname.toLowerCase() === "youtu.be" ? "www.youtube.com" : url.hostname.toLowerCase();
    const sourceUrl = new URL(`https://${sourceHost}/watch`);
    sourceUrl.searchParams.set("v", videoId);

    return {
        provider: "youtube",
        providerLabel: "YouTube",
        sourceUrl: sourceUrl.toString(),
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
        height: 315
    };
}

function parseSoundCloudUrl(url: URL): ThemeSongEmbed | null {
    if (url.pathname.split("/").filter(Boolean).length < 2) {
        return null;
    }

    const sourceUrl = new URL(`https://${url.hostname.toLowerCase()}${url.pathname}`);

    return {
        provider: "soundcloud",
        providerLabel: "SoundCloud",
        sourceUrl: sourceUrl.toString(),
        embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(sourceUrl.toString())}`,
        height: 166
    };
}

function parseAppleMusicUrl(url: URL): ThemeSongEmbed | null {
    const pathname = url.pathname.replace(/\/+$/, "");
    if (!pathname || pathname === "/") {
        return null;
    }

    const sourceUrl = new URL(`https://music.apple.com${pathname}`);
    const trackId = url.searchParams.get("i");
    if (trackId) {
        sourceUrl.searchParams.set("i", trackId);
    }

    const embedUrl = new URL(`https://embed.music.apple.com${pathname}`);
    if (trackId) {
        embedUrl.searchParams.set("i", trackId);
    }

    return {
        provider: "appleMusic",
        providerLabel: "Apple Music",
        sourceUrl: sourceUrl.toString(),
        embedUrl: embedUrl.toString(),
        height: 175
    };
}
