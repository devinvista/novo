import { connection } from "./db";

console.log("🔄 Migrating Key Results to support multiple service lines...");

try {
  // Add the new column
  const addColumn = connection.prepare(`
    ALTER TABLE key_results 
    ADD COLUMN service_line_ids TEXT DEFAULT '[]'
  `);
  
  try {
    addColumn.run();
    console.log("✅ Added service_line_ids column");
  } catch (error: any) {
    if (error.message.includes('duplicate column name')) {
      console.log("ℹ️  Column service_line_ids already exists");
    } else {
      throw error;
    }
  }

  // Migrate existing data from serviceLineId to serviceLineIds array
  const keyResultsWithServiceLine = connection.prepare(`
    SELECT id, service_line_id 
    FROM key_results 
    WHERE service_line_id IS NOT NULL 
    AND (service_line_ids IS NULL OR service_line_ids = '[]')
  `).all();

  if (keyResultsWithServiceLine.length > 0) {
    console.log(`📋 Migrating ${keyResultsWithServiceLine.length} key results with service lines...`);
    
    const updateStmt = connection.prepare(`
      UPDATE key_results 
      SET service_line_ids = ? 
      WHERE id = ?
    `);

    for (const kr of keyResultsWithServiceLine) {
      const serviceLineIds = JSON.stringify([kr.service_line_id]);
      updateStmt.run(serviceLineIds, kr.id);
    }
    
    console.log("✅ Migrated existing service line data to arrays");
  }

  // Update strategic indicator IDs to be proper arrays if they're not already
  const keyResultsWithStringIndicators = connection.prepare(`
    SELECT id, strategic_indicator_ids 
    FROM key_results 
    WHERE strategic_indicator_ids IS NOT NULL 
    AND strategic_indicator_ids != '[]'
  `).all();

  if (keyResultsWithStringIndicators.length > 0) {
    console.log(`📋 Updating ${keyResultsWithStringIndicators.length} strategic indicator formats...`);
    
    const updateIndicatorStmt = connection.prepare(`
      UPDATE key_results 
      SET strategic_indicator_ids = ? 
      WHERE id = ?
    `);

    for (const kr of keyResultsWithStringIndicators) {
      let indicatorIds = kr.strategic_indicator_ids;
      
      // If it's a string like "1" or "2", convert to array
      if (typeof indicatorIds === 'string' && !indicatorIds.startsWith('[')) {
        indicatorIds = JSON.stringify([parseInt(indicatorIds)]);
      }
      // If it's already an array string, keep it
      else if (typeof indicatorIds === 'string' && indicatorIds.startsWith('[')) {
        // Already in correct format
        continue;
      }
      
      updateIndicatorStmt.run(indicatorIds, kr.id);
    }
    
    console.log("✅ Updated strategic indicator ID formats");
  }

  console.log("🎉 Database migration completed successfully!");

} catch (error) {
  console.error("❌ Migration failed:", error);
  process.exit(1);
}