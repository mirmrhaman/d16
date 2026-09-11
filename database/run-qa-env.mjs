import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import dotenv from "dotenv";

// Parse dotenv as data. Never source credentials as shell programs or write them
// into temporary scripts. Child processes receive secrets only in their environment.
const [path, command, ...args] = process.argv.slice(2);
if (!command) throw new Error("Usage: run-qa-env.mjs <env-file-or-dash> <command> [args]");
const parsed = path !== "-" && existsSync(path) ? dotenv.parse(readFileSync(path)) : {};
const allowed = /^(DB_[A-Z0-9_]+|QA_[A-Z0-9_]+|NODE_ENV|TZ)$/;
const values = Object.fromEntries(Object.entries(parsed).filter(([key]) => allowed.test(key)));
const result = spawnSync(command, args, { stdio: "inherit", env: { ...process.env, ...values, D16_QA_ENV_LOADED: "1" } });
if (result.error) { process.stderr.write("QA verification process could not start\n"); process.exit(1); }
process.exit(result.status ?? 1);
