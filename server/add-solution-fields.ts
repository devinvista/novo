import Database from "better-sqlite3";

const db = new Database("./okr.db");

console.log("Adding solution, service line, and service fields to users table...");

try {
  // Add the new columns to users table
  db.exec(`
    ALTER TABLE users ADD COLUMN solution_ids TEXT DEFAULT '[]';
    ALTER TABLE users ADD COLUMN service_line_ids TEXT DEFAULT '[]';
    ALTER TABLE users ADD COLUMN service_ids TEXT DEFAULT '[]';
  `);
  
  console.log("✅ Successfully added solution fields to users table");
  
  // Update existing users to have empty arrays
  db.prepare(`
    UPDATE users 
    SET solution_ids = '[]', service_line_ids = '[]', service_ids = '[]' 
    WHERE solution_ids IS NULL OR service_line_ids IS NULL OR service_ids IS NULL
  `).run();
  
  console.log("✅ Updated existing users with empty arrays");
  
} catch (error: any) {
  if (error.message.includes("duplicate column name")) {
    console.log("⚠️ Columns already exist, skipping...");
  } else {
    console.error("❌ Error adding fields:", error.message);
  }
} finally {
  db.close();
}