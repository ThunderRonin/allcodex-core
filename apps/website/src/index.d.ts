import './style.css';
export declare const LocaleContext: import("preact").Context<string>;
export declare function App({ repoStargazersCount }: {
    repoStargazersCount: any;
}): import("preact").JSX.Element;
export declare function LocaleProvider({ children }: {
    children: any;
}): import("preact").JSX.Element;
export declare function prerender(data: any): Promise<{
    html: string;
    links: Set<string> | undefined;
    data: any;
    head: {
        lang: string;
    };
}>;
//# sourceMappingURL=index.d.ts.map