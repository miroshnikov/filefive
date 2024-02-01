declare module '*.less' {
    const classes: { readonly [key: string]: string };
    export default classes;
}

declare module '*.svg' {
    export default function (): JSX.Element;
}


