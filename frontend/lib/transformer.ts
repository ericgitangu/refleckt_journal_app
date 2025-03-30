/**
 * This is your transformer file for superjson
 * It's used to handle date objects and other non-serializable data across client and server
 */
import superjson from 'superjson';

// Export the transformer for use in tRPC setup
export const transformer = superjson;
