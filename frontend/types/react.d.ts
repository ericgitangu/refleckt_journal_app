import * as React from 'react';

// React type definitions
declare module 'react' {
  // Basic React types
  export type ReactNode = 
    | React.ReactElement
    | string
    | number
    | boolean
    | null
    | undefined
    | React.ReactNodeArray;
  
  export type ReactNodeArray = ReadonlyArray<ReactNode>;
  
  export interface ReactElement<P = any, T extends string | JSXElementConstructor<any> = string | JSXElementConstructor<any>> {
    type: T;
    props: P;
    key: Key | null;
  }
  
  export type JSXElementConstructor<P> = ((props: P) => ReactElement | null) | (new (props: P) => Component<P, any>);
  
  export type Key = string | number;
  
  // React hooks
  export function useState<T>(initialState: T | (() => T)): [T, Dispatch<SetStateAction<T>>];
  export function useState<T = undefined>(): [T | undefined, Dispatch<SetStateAction<T | undefined>>];
  
  export type SetStateAction<S> = S | ((prevState: S) => S);
  export type Dispatch<A> = (value: A) => void;
  
  export function useEffect(effect: EffectCallback, deps?: DependencyList): void;
  export function useLayoutEffect(effect: EffectCallback, deps?: DependencyList): void;
  
  export type EffectCallback = () => (void | (() => void | undefined));
  export type DependencyList = ReadonlyArray<any>;
  
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: DependencyList): T;
  export function useMemo<T>(factory: () => T, deps: DependencyList | undefined): T;
  export function useRef<T = undefined>(): MutableRefObject<T | undefined>;
  export function useRef<T>(initialValue: T): MutableRefObject<T>;
  
  export interface MutableRefObject<T> {
    current: T;
  }
  
  export function useContext<T>(context: Context<T>): T;
  export interface Context<T> {
    Provider: Provider<T>;
    Consumer: Consumer<T>;
    displayName?: string;
  }
  export type Provider<T> = ComponentType<ProviderProps<T>>;
  export type Consumer<T> = ComponentType<ConsumerProps<T>>;
  export interface ProviderProps<T> {
    value: T;
    children?: ReactNode;
  }
  export interface ConsumerProps<T> {
    children: (value: T) => ReactNode;
  }
  
  export type ComponentType<P = {}> = ComponentClass<P> | FunctionComponent<P>;
  export interface ComponentClass<P = {}, S = {}> extends StaticLifecycle<P, S> {
    new (props: P, context?: any): Component<P, S>;
    propTypes?: WeakValidationMap<P>;
    contextType?: Context<any>;
    defaultProps?: Partial<P>;
    displayName?: string;
  }
  export interface FunctionComponent<P = {}> {
    (props: P, context?: any): ReactElement<any, any> | null;
    propTypes?: WeakValidationMap<P>;
    defaultProps?: Partial<P>;
    displayName?: string;
  }
  
  export interface Component<P = {}, S = {}, SS = any> extends ComponentLifecycle<P, S, SS> {
    render(): ReactNode;
    props: Readonly<P>;
    state: Readonly<S>;
    context: any;
    refs: {
        [key: string]: ReactInstance
    };
  }
  
  export interface WeakValidationMap<T> {
    [key: string]: any;
  }
  
  export interface StaticLifecycle<P, S> {
  }
  
  export interface ComponentLifecycle<P, S, SS = any> {
  }
  
  export type ReactInstance = Component<any> | Element;

  // Forward ref types
  export function forwardRef<T, P = {}>(
    render: (props: P, ref: React.Ref<T>) => React.ReactElement | null
  ): (props: P & React.RefAttributes<T>) => React.ReactElement | null;

  // Instead of ElementRef, use the following:
  export type InferRef<T> = T extends React.ForwardRefExoticComponent<React.RefAttributes<infer R>> ? R : never;

  // Component props types
  export type ComponentPropsWithoutRef<T extends React.ElementType> = 
    React.PropsWithoutRef<React.ComponentProps<T>>;
} 