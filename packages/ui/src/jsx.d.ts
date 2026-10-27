/**
 * Zero-dependency ambient JSX declarations for @repo/ui
 * Enables JSX compilation under tsconfig.react.json without external npm types.
 */

declare namespace JSX {
  type Element = string | number | boolean | null | undefined | Element[] | {
    type: any;
    props: any;
    key?: any;
  };

  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

declare module "react" {
  export type ReactNode = any;
  export type FC<P = {}> = (props: P) => JSX.Element;
  export function createElement(type: any, props?: any, ...children: any[]): any;
  export default {
    createElement,
  };
}

declare module "react/jsx-runtime" {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}

declare module "react/jsx-dev-runtime" {
  export const jsxDEV: any;
  export const Fragment: any;
}
