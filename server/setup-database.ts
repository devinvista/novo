import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { 
  users, regions, subRegions, serviceLines, strategicIndicators, 
  objectives, keyResults, actions, checkpoints, activities,
  solutions, services
} from "@shared/schema";

// Initialize SQLite database
const sqlite = new Database('okr.db');
const db = drizzle(sqlite, { 
  schema: { 
    users, regions, subRegions, serviceLines, strategicIndicators,
    objectives, keyResults, actions, checkpoints, activities,
    solutions, services
  } 
});

async function setupDatabase() {
  console.log('🔄 Setting up SQLite database...');
  
  try {
    // Test basic functionality
    const result = sqlite.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    console.log(`✅ Database connected. Found ${result.count} users.`);
    
    // Check if we have basic seed data
    const regionCount = sqlite.prepare('SELECT COUNT(*) as count FROM regions').get() as { count: number };
    const solutionCount = sqlite.prepare('SELECT COUNT(*) as count FROM solutions').get() as { count: number };
    
    console.log(`📊 Database status:`);
    console.log(`  - Users: ${result.count}`);
    console.log(`  - Regions: ${regionCount.count}`);
    console.log(`  - Solutions: ${solutionCount.count}`);
    
    return true;
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    return false;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  setupDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { setupDatabase };