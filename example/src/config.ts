import { config } from "nooh";

interface App {
  Variables: {
    db: "/tmp/db";
  };
}

export default config<App>({
  routes: "src/routes",
});
