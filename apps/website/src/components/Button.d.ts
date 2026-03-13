import "./Button.css";
import { ComponentChildren } from "preact";
interface LinkProps {
    className?: string;
    href?: string;
    openExternally?: boolean;
    children?: ComponentChildren;
    title?: string;
    onClick?: (e: MouseEvent) => void;
    download?: boolean;
}
interface ButtonProps extends Omit<LinkProps, "children"> {
    href?: string;
    iconSvg?: string;
    text: ComponentChildren;
    openExternally?: boolean;
    download?: boolean;
    outline?: boolean;
}
export default function Button({ iconSvg, text, className, outline, ...restProps }: ButtonProps): import("preact").JSX.Element;
export declare function Link({ openExternally, children, download, ...restProps }: LinkProps): import("preact").JSX.Element;
export {};
//# sourceMappingURL=Button.d.ts.map