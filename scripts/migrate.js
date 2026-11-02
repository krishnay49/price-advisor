// Applies db/schema.sql to the database in DATABASE_URL.  Run: npm run db:migrate
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const schema = fs.readFileSync(path.join(__dirname, "../db/schema.sql"), "utf-8");

pool
  .query(schema)
  .then(() => console.log("Schema applied successfully."))
  .catch((e) => console.error("Migration failed:", e))
  .finally(() => pool.end());
