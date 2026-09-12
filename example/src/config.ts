import { config } from "nooh";

export interface App {
  Variables: {
    db: "/tmp/db";
  };
}

export default config<App>({
  routes: "src/routes",
});
