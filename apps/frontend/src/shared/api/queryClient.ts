import { QueryClient } from "@tanstack/react-query";

// Its own module so that stores can fetch through it without importing the router.
export const queryClient = new QueryClient();
