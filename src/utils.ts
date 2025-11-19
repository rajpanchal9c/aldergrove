import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function createPageUrl(pageName: string) {
    if (pageName === "TreeView") return "/";
    if (pageName === "AddMember") return "/add-member";
    return `/${pageName.toLowerCase()}`;
}
