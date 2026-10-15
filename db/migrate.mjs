
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { fileURLToPath } from "node:url";

const { Client } = pg;

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

const sqlFile = path.join(
  currentDirectory,
  "migrations",
  "001_create_tables.sql"
);

const sql = fs.readFileSync(sqlFile, "utf8");

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

try {
  await client.connect();
  await client.query(sql);
  console.log("Database tables created successfully.");
} catch (error) {
  console.error("Migration failed:", error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
