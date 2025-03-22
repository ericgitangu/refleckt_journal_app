import '@testing-library/jest-dom';

// Polyfill for TextEncoder/TextDecoder (needed for MSW)
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = require('util').TextEncoder;
  global.TextDecoder = require('util').TextDecoder;
}

// Polyfill for Response (needed for MSW)
if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    constructor(body?: any, init?: any) {
      this.body = body;
      this.init = init;
    }
    body: any;
    init: any;
    json() {
      return Promise.resolve(JSON.parse(this.body));
    }
    static json(data: any) {
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } as any;
}

// Polyfill for BroadcastChannel (needed for MSW)
if (typeof global.BroadcastChannel === 'undefined') {
  global.BroadcastChannel = class BroadcastChannel {
    constructor(name: string) {
      this.name = name;
    }
    name: string;
    postMessage(message: any) {}
    addEventListener(type: string, listener: EventListener) {}
    removeEventListener(type: string, listener: EventListener) {}
    close() {}
    onmessage: ((ev: MessageEvent) => any) | null = null;
    onmessageerror: ((ev: MessageEvent) => any) | null = null;
  } as any;
}

// This file is loaded by jest.config.js setupFilesAfterEnv 

// Extend Jest's expect
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveTextContent(text: string | RegExp): R;
      toBeVisible(): R;
      toHaveClass(className: string): R;
      toHaveAttribute(attr: string, value?: string): R;
      toBeDisabled(): R;
      toBeEnabled(): R;
      toBeEmpty(): R;
      toBeChecked(): R;
      toBePartiallyChecked(): R;
      toHaveFocus(): R;
      toHaveStyle(css: string): R;
      toHaveValue(value: string | string[] | number): R;
      toBeRequired(): R;
      toBeInvalid(): R;
      toBeValid(): R;
      toContainElement(element: HTMLElement | null): R;
      toContainHTML(htmlText: string): R;
      toHaveDescription(text: string | RegExp): R;
    }
  }
} 