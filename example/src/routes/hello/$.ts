import logger from "@middleware/logger";
import { group } from "nooh";

export default group({
  middleware: [logger],
});
