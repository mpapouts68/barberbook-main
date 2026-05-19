const path = require("path");

/** PM2 config — cwd = repo root (works on any path) */
module.exports = {
  apps: [
    {
      name: "peqi",
      cwd: path.join(__dirname, ".."),
      script: "dist/index.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: "5100",
      },
      max_memory_restart: "500M",
    },
  ],
};
