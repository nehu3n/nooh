import { get } from "@router/hello/[id]";

export default get((c) => {
  const id = c.req.param("id"); // id it's type-safe!

  return c.json({
    hello: "world",
    id,
  });
});
