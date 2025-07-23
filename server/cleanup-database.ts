import { db, connection } from "./db";
import { 
  users, objectives, keyResults, actions, checkpoints, actionComments 
} from "@shared/schema";
import { eq, ne } from "drizzle-orm";

async function cleanupDatabase() {
  try {
    console.log("Starting database cleanup...");
    
    // Delete action comments first (foreign key dependency)
    const deletedComments = await db.delete(actionComments);
    console.log("✓ Deleted all action comments");
    
    // Delete checkpoints (foreign key dependency on key results)
    const deletedCheckpoints = await db.delete(checkpoints);
    console.log("✓ Deleted all checkpoints");
    
    // Delete actions (foreign key dependency on key results)
    const deletedActions = await db.delete(actions);
    console.log("✓ Deleted all actions");
    
    // Delete key results (foreign key dependency on objectives)
    const deletedKeyResults = await db.delete(keyResults);
    console.log("✓ Deleted all key results");
    
    // Delete objectives (foreign key dependency on users)
    const deletedObjectives = await db.delete(objectives);
    console.log("✓ Deleted all objectives");
    
    // Delete activities table if it exists (this was causing the foreign key constraint error)
    try {
      await connection.execute("DELETE FROM activities");
      console.log("✓ Deleted all activities");
    } catch (error) {
      console.log("- Activities table not found or already empty");
    }
    
    // Delete all users except admin (username = 'admin')
    const deletedUsers = await db.delete(users).where(ne(users.username, 'admin'));
    console.log("✓ Deleted all users except admin");
    
    console.log("Database cleanup completed successfully!");
    console.log("Only admin user and reference data (regions, solutions, etc.) remain.");
    
  } catch (error) {
    console.error("Error during database cleanup:", error);
    throw error;
  }
}

// Run the cleanup
cleanupDatabase()
  .then(() => {
    console.log("Cleanup script finished successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Cleanup script failed:", error);
    process.exit(1);
  });