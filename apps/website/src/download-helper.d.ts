import { TFunction } from 'i18next';
export type App = "desktop" | "server";
export type Architecture = 'x64' | 'arm64';
export type Platform = "macos" | "windows" | "linux" | "pikapod" | "docker";
export interface DownloadInfo {
    recommended?: boolean;
    name: string;
    url?: string;
}
export interface DownloadMatrixEntry {
    title: Record<Architecture, string> | string;
    description: Record<Architecture, string> | string;
    downloads: Record<string, DownloadInfo>;
    helpUrl?: string;
    quickStartTitle?: string;
    quickStartCode?: string;
}
export interface RecommendedDownload {
    architecture: Architecture;
    platform: Platform;
    url: string;
    name: string;
}
type DownloadMatrix = Record<App, {
    [P in Platform]?: DownloadMatrixEntry;
}>;
export declare function getDownloadMatrix(t: TFunction<"translation", undefined>): DownloadMatrix;
export declare function buildDownloadUrl(t: TFunction<"translation", undefined>, app: App, platform: Platform, format: string, architecture: Architecture): string;
export declare function getArchitecture(): Promise<Architecture | null>;
export declare function getPlatform(): Platform | null;
export declare function getRecommendedDownload(t: TFunction<"translation", undefined>): Promise<RecommendedDownload | null>;
export {};
//# sourceMappingURL=download-helper.d.ts.map