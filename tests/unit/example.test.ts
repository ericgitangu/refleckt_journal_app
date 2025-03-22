import { trpc } from '@/hooks/useTRPC';

describe('Example Unit Test', () => {
  it('should return Hello tRPC', async () => {
    // Might require mocking or a real server for real test
    const result = await trpc.hello.query();
    expect(result).toBe('Hello tRPC');
  });
});
