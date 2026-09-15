import logger from "@middleware/logger";
import { group } from "@nooh-ts/nooh";

export default group({
  middleware: [logger],
});
