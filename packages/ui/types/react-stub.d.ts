/**
 * تایپ‌های سادهٔ react فقط برای «npm run typecheck:stub» در محیطی که @types/react نصب نیست (مثلاً بدون اینترنت).
 * در پروژهٔ واقعی از tsconfig.json و @types/react استفاده کنید؛ این فایل بررسی ضعیف‌تری می‌کند (props آزاد).
 */
declare module "react" {
  export type ReactNode = any;
  export type ReactElement = any;
  export type CSSProperties = Record<string, any>;
  export type Ref<T> = any;
  export type RefObject<T> = { current: T | null };
  export type Key = string | number;
  export interface HTMLAttributes<T> { [k: string]: any }
  export interface ButtonHTMLAttributes<T> extends HTMLAttributes<T> {}
  export interface InputHTMLAttributes<T> extends HTMLAttributes<T> {}
  export interface TextareaHTMLAttributes<T> extends HTMLAttributes<T> {}
  export interface SelectHTMLAttributes<T> extends HTMLAttributes<T> {}
  export interface AnchorHTMLAttributes<T> extends HTMLAttributes<T> {}
  export interface ImgHTMLAttributes<T> extends HTMLAttributes<T> {}
  export interface SVGProps<T> extends HTMLAttributes<T> {}
  export interface ChangeEvent<T = any> { target: T & any; currentTarget: T & any; [k: string]: any }
  export interface KeyboardEvent<T = any> { key: string; currentTarget: T & any; target: any; preventDefault(): void; stopPropagation(): void; [k: string]: any }
  export interface PointerEvent<T = any> { clientX: number; clientY: number; currentTarget: T & any; [k: string]: any }
  export interface ClipboardEvent<T = any> { clipboardData: DataTransfer; preventDefault(): void; currentTarget: T & any; [k: string]: any }
  export interface MouseEvent<T = any> { currentTarget: T & any; target: any; preventDefault(): void; [k: string]: any }
  export interface FormEvent<T = any> { currentTarget: T & any; preventDefault(): void; [k: string]: any }
  export interface FocusEvent<T = any> { currentTarget: T & any; relatedTarget: any; [k: string]: any }
  export function useState<S>(initial: S | (() => S)): [S, (v: S | ((p: S) => S)) => void];
  export function useEffect(fn: () => void | (() => void), deps?: readonly unknown[]): void;
  export function useLayoutEffect(fn: () => void | (() => void), deps?: readonly unknown[]): void;
  export function useRef<T>(initial: T): { current: T };
  export function useRef<T>(initial: T | null): { current: T | null };
  export function useId(): string;
  export function useMemo<T>(fn: () => T, deps: readonly unknown[]): T;
  export function useCallback<T extends (...a: any[]) => any>(fn: T, deps: readonly unknown[]): T;
  export function useReducer<S, A>(r: (s: S, a: A) => S, init: S): [S, (a: A) => void];
  export interface Context<T> { Provider: any; Consumer: any; readonly __type?: T }
  export function createContext<T>(v: T): Context<T>;
  export function useContext<T>(c: Context<T>): T;
  export function cloneElement(el: any, props?: any, ...children: any[]): any;
  export function isValidElement(x: unknown): boolean;
  export const Fragment: any;
}
declare module "react/jsx-runtime" {
  export namespace JSX {
    type Element = any;
    interface IntrinsicElements { [k: string]: any }
    interface ElementChildrenAttribute { children: {} }
    interface IntrinsicAttributes { key?: any }
  }
  export function jsx(type: any, props: any, key?: any): any;
  export function jsxs(type: any, props: any, key?: any): any;
  export const Fragment: any;
}
