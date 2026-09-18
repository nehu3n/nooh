import { config } from "@nooh-ts/nooh";

export interface App {
  Variables: {
    db: "/tmp/db";
  };
}

export default config<App>({
  routes: "src/routes",
});
