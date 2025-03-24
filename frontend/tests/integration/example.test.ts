import { appRouter } from "../../lib/trpc/router";

describe("Example Integration Test", () => {
  it("should handle basic operations", async () => {
    // Create a caller for the router
    const caller = appRouter.createCaller({
      session: null,
      headers: {},
    });

    // Test a simple procedure
    const result = await caller.hello();

    // Use Jest's expect instead of Chai
    // @ts-ignore -- Jest assertions
    expect(result).toEqual("Hello tRPC");
  });
});
