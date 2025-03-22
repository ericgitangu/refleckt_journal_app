import { trpc } from '../../hooks/useTRPC';

describe('Example Unit Test', () => {
  it('should return Hello tRPC', async () => {
    const result = await trpc.hello.query();
    (expect(result) as any).toBe('Hello tRPC');
  });
}); 