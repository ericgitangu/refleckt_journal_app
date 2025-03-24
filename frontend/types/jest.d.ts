import "@testing-library/jest-dom";
import { expect } from "@jest/globals";

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveBeenCalledWith(...args: any[]): R;
    }
  }
}
