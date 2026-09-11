import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { readFileSync } from "node:fs";

if (process.env.API_ENV_FILE) {
  const result = dotenv.config({ path: process.env.API_ENV_FILE });
  if (result.error) throw new Error("Configured API environment file could not be loaded");
} else if (!process.env.DB_NAME) {
  const candidates = ["database/.env.qa.local", "server/.env", ".env"];
  for (const path of candidates) {
    const result = dotenv.config({ path });
    if (!result.error) break;
  }
}

export const buildPoolOptions = (env) => {
  for (const key of ["DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD"]) {
    if (!env[key]) throw new Error(`Missing required environment variable: ${key}`);
  }
  if (String(env.NODE_ENV).toLowerCase() === "production") throw new Error("Production rollout is not enabled; this API remains QA-only");
  if (env.DB_NAME !== "dinterio_d16_qa") throw new Error("DB_NAME must be dinterio_d16_qa");
  const port = Number(env.DB_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid DB_PORT");
  const host = env.DB_HOST === "localhost" ? "127.0.0.1" : env.DB_HOST;
  const local = ["127.0.0.1", "::1"].includes(host);
  if (!local && env.DB_SSL === "false") throw new Error("Remote database connections require verified TLS");
  const useTls = env.DB_SSL === "true" || !local;
  return {
    host, port, user: env.DB_USER, password: env.DB_PASSWORD, database: env.DB_NAME,
    ...(env.DB_SOCKET_PATH ? { socketPath: env.DB_SOCKET_PATH } : {}),
    ...(useTls ? { ssl: { rejectUnauthorized: true, ...(env.DB_SSL_CA_FILE ? { ca: readFileSync(env.DB_SSL_CA_FILE, "utf8") } : {}) } } : {}),
    charset: "utf8mb4", timezone: "Z", dateStrings: true,
    waitForConnections: true, connectionLimit: 10, queueLimit: 100,
    connectTimeout: 10000, multipleStatements: false,
  };
};

export const pool = mysql.createPool(buildPoolOptions(process.env));
pool.pool.on("connection", (connection) => {
  connection.query("SET time_zone = '+00:00'", (error) => { if (error) connection.destroy(); });
});
