import { ComponentChildren, HTMLAttributes } from "preact";
interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
    title: ComponentChildren;
    imageUrl?: string;
    iconSvg?: string;
    className?: string;
    moreInfoUrl?: string;
    children: ComponentChildren;
}
export default function Card({ title, children, imageUrl, iconSvg, className, moreInfoUrl, ...restProps }: CardProps): import("preact").JSX.Element;
export {};
//# sourceMappingURL=Card.d.ts.map