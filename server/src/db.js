import mysql from "mysql2/promise";
import dotenv from "dotenv";

if (process.env.API_ENV_FILE) {
  dotenv.config({ path: process.env.API_ENV_FILE });
} else {
  const candidates = ["database/.env.qa.local", "database/.env.qa.example", "server/.env", ".env"];
  for (const path of candidates) {
    const result = dotenv.config({ path });
    if (!result.error) break;
  }
}

const required = ["DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD"];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

if ((process.env.NODE_ENV || "").toLowerCase() === "production") {
  throw new Error("API is restricted to QA usage for now. NODE_ENV=production is blocked.");
}

if (!String(process.env.DB_NAME).toLowerCase().includes("qa")) {
  throw new Error("DB_NAME must point to QA database. Production DB is intentionally blocked.");
}

export const pool = mysql.createPool({
  host: String(process.env.DB_HOST).toLowerCase() === "localhost" ? "127.0.0.1" : process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
