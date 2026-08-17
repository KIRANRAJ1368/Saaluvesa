import { Sequelize } from "sequelize";
import mysql from "mysql2/promise";
import "dotenv/config";

export const databaseName = process.env.DB_NAME || "saaluvesa";
export const sequelize = new Sequelize(
  databaseName,
  process.env.DB_USER || "root",
  process.env.DB_PASSWORD || "",
  {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    dialect: "mysql",
    logging: false,
  },
);

// Connect without selecting a schema so a new local installation can boot.
export async function ensureDatabase() {
  if (!/^[A-Za-z0-9_]+$/.test(databaseName))
    throw new Error(
      "DB_NAME may contain only letters, numbers, and underscores",
    );
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
  });
  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
  } finally {
    await connection.end();
  }
}
