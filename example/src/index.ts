import { serve } from "@hono/node-server";
import app from "../.nooh/app";

serve({
  fetch: app.fetch,
  port: 3000,
});
