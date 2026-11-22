import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { followSignedInPlayer } from "./features/online/store/followSignedInPlayer.ts";
import "./index.css";
import { router } from "./router.ts";
import { queryClient } from "./shared/api/queryClient.ts";

followSignedInPlayer();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
