// Mock tRPC implementation for testing
export const trpc = {
  hello: {
    query: async () => "Hello tRPC",
  },
};
