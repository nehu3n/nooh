import { middleware } from "@router/middleware/logger";

export default middleware(async (c, next) => {
  const start = Date.now();

  await next();

  const duration = Date.now() - start;

  console.log(`${c.req.method} ${c.req.path} ${c.res.status} ${duration}ms`);
});
