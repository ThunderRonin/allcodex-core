interface Locale {
    id: string;
    name: string;
    rtl?: boolean;
}
export declare function initTranslations(lng: string): void;
export declare const LOCALES: Locale[];
export declare function mapLocale(locale: string): string;
export declare function swapLocaleInUrl(url: string, newLocale: string): string;
export declare function extractLocaleFromUrl(url: string): string | undefined;
export {};
//# sourceMappingURL=i18n.d.ts.map