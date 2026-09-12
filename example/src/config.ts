import { config, type NoohConfig } from "nooh";

interface App {
  Variables: {
    db: "/tmp/db";
  };
}

export default config<App>({
  routes: "src/routes",
}) satisfies NoohConfig<App> as NoohConfig<App>;
