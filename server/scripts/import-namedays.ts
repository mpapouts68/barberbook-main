import "dotenv/config";
import { loadEortologioNamedays } from "./load-namedays";

const force = process.argv.includes("--force");
const fileArg = process.argv.find((a) => a.startsWith("--file="));
const filePath = fileArg ? fileArg.slice("--file=".length) : undefined;

loadEortologioNamedays({ force, filePath })
  .then((count) => {
    console.log(`Done. ${count} namedays in database.`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("Import failed:", error);
    process.exit(1);
  });
