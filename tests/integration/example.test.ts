import { expect } from 'chai';
import { appRouter } from '@/server/trpc/router';

describe('Example Integration Test', () => {
  it('should return Hello tRPC from router', async () => {
    const response = await appRouter.createCaller({}).hello();
    expect(response).to.equal('Hello tRPC');
  });
});
