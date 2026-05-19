const path = require("path");
const fs = require("fs");

/** Load .env into PM2 env so EMAIL_*, DATABASE_URL, SESSION_SECRET are available */
function loadEnvFile(envPath) {
  const env = {
    NODE_ENV: "production",
    PORT: "5100",
  };
  if (!fs.existsSync(envPath)) {
    return env;
  }
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const appRoot = path.join(__dirname, "..");
const envFromFile = loadEnvFile(path.join(appRoot, ".env"));

module.exports = {
  apps: [
    {
      name: "peqi",
      cwd: appRoot,
      script: "dist/index.js",
      instances: 1,
      exec_mode: "fork",
      env: envFromFile,
      max_memory_restart: "500M",
    },
  ],
};
