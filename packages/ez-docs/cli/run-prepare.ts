import { prepareRoutes } from "./prepare";

const force = process.argv.includes("--force");
prepareRoutes(process.cwd(), { force });
