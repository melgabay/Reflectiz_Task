import sqlite3 from "sqlite3";
import path from "path";
import fs from "fs";
import { selectors } from "./selectors";
import { testData } from "./testData";

// 1. Create a folder for the database if it doesn't exist
export const DB_FOLDER = path.join(process.cwd(), "database");

function ensureDbFolder() {
  if (!fs.existsSync(DB_FOLDER)) {
    fs.mkdirSync(DB_FOLDER, { recursive: true });
  }
}


// 2. Create file path for the SQLite database
export const DB_PATH = path.join(DB_FOLDER, "form_selectors.sqlite");

export async function initializeDatabase(): Promise<void> {
  ensureDbFolder();

  const db = new sqlite3.Database(DB_PATH);

  await new Promise<void>((resolve, reject) => {
    db.serialize(() => { // serialize = guaranteed order of execution of the queries.
      
      
        // 3. Create the table
      db.run(
        `
        CREATE TABLE IF NOT EXISTS form_data (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          section TEXT NOT NULL,
          field_name TEXT NOT NULL,
          selector TEXT NOT NULL,
          property TEXT NOT NULL,
          value TEXT NOT NULL
        )
      `,
        err => {
          if (err) return reject(err);


          // 4. Clear old data to avoid duplicates
          db.run(`DELETE FROM form_data`, err2 => {
            if (err2) return reject(err2);


            // 5. Execute the INSERT queries as many as we have selectors on the selectors.ts file,
            // using the data from testData to populate the "value" column
            const stmt = db.prepare(
              `
              INSERT INTO form_data (section, field_name, selector, property, value)
              VALUES (?, ?, ?, ?, ?)
            `,
              err3 => {
                if (err3) return reject(err3);

                // Helper function to find the value in testData without worrying about case sensitivity
                const findValue = (section: string, field: string): string => {
                  const dataSection = (testData as any)[section];
                  if (!dataSection) return "N/A";

                  // Look for an exact match first, then a case-insensitive match
                  const exactMatch = dataSection[field];
                  if (exactMatch !== undefined) return String(exactMatch);

                  const caseInsensitiveKey = Object.keys(dataSection).find(
                    k => k.toLowerCase() === field.toLowerCase()
                  );

                  return caseInsensitiveKey ? String(dataSection[caseInsensitiveKey]) : "N/A";
                };

                // Iterate through all selector sections (including product)
                for (const [sectionName, fields] of Object.entries(selectors)) {
                  for (const [fieldName, selectorValue] of Object.entries(fields)) {
                    const val = findValue(sectionName, fieldName);
                    stmt.run(sectionName, fieldName, selectorValue, "value", val);
                  }
                }

                stmt.finalize(err4 => {
                  if (err4) return reject(err4);
                  resolve();
                });
              }
            );
          });
        }
      );
    });
  });

  db.close();
}

export async function deleteDatabaseFile(): Promise<void> {
  try {
    await fs.promises.unlink(DB_PATH);
  } catch (e: any) {
    // Ignore if already deleted
    if (e?.code !== "ENOENT") throw e;
  }
}