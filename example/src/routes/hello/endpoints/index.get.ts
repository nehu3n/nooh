import logger from "@middleware/logger";

import { get } from "@router/hello";

export default get({
  handler: (c) => c.text("Hello, World!"),
  middleware: [logger],
});
