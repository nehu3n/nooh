import logger from "@middleware/logger";

import { get } from "@router/hello/[id]";

export default get({
  handler: (c) => {
    const id = c.req.param("id");

    return c.json({
      hello: "world",
      id,
    });
  },
  middleware: [logger],
});
