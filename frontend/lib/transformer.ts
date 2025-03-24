/**
 * Shared transformer for tRPC client and server
 * This ensures consistent data serialization between client and server
 */

import superjson from "superjson";

// Export the transformer for use in tRPC setup
export const transformer = superjson;
