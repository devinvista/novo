import { db } from "./mysql-db";
import { keyResults, checkpoints } from "@shared/mysql-schema-final";
import { eq, desc } from "drizzle-orm";

async function fixKeyResultValues() {
  console.log('🔄 Fixing key result values based on latest checkpoints...');
  
  try {
    // Get all key results
    const allKeyResults = await db.select().from(keyResults);
    
    for (const kr of allKeyResults) {
      console.log(`\n📊 Processing Key Result: ${kr.title} (ID: ${kr.id})`);
      
      // Get all checkpoints for this key result, ordered by update date desc
      const krCheckpoints = await db
        .select()
        .from(checkpoints)
        .where(eq(checkpoints.keyResultId, kr.id))
        .orderBy(desc(checkpoints.updatedAt));
      
      if (krCheckpoints.length === 0) {
        console.log(`   ⚠️  No checkpoints found for this KR`);
        continue;
      }
      
      // Find the most recently updated checkpoint with actual value
      let latestCheckpoint = null;
      let latestUpdateDate = null;
      
      for (const checkpoint of krCheckpoints) {
        const updateDate = new Date(checkpoint.updatedAt);
        const actualValue = Number(checkpoint.actualValue) || 0;
        
        console.log(`   📌 Checkpoint: ${checkpoint.title}, actualValue: ${actualValue}, updated: ${updateDate.toISOString()}`);
        
        if (!latestUpdateDate || updateDate > latestUpdateDate) {
          latestUpdateDate = updateDate;
          latestCheckpoint = checkpoint;
        }
      }
      
      if (latestCheckpoint) {
        const currentValue = Number(latestCheckpoint.actualValue) || 0;
        const targetValue = Number(kr.targetValue) || 1;
        const progress = targetValue > 0 ? Math.min((currentValue / targetValue) * 100, 100) : 0;
        
        console.log(`   🔄 Updating KR: currentValue from ${kr.currentValue} to ${currentValue}`);
        console.log(`   📈 Progress: ${progress.toFixed(2)}%`);
        
        // Update the key result
        await db.update(keyResults).set({
          currentValue: currentValue.toString(),
          progress: progress.toFixed(2),
          updatedAt: new Date(),
        }).where(eq(keyResults.id, kr.id));
        
        console.log(`   ✅ Updated successfully!`);
      } else {
        console.log(`   ⚠️  No valid checkpoint found for update`);
      }
    }
    
    console.log('\n🎉 Key result values fixed successfully!');
  } catch (error) {
    console.error('❌ Error fixing key result values:', error);
    throw error;
  }
}

// Execute the fix
fixKeyResultValues().then(() => {
  console.log('✅ Fix completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Fix failed:', error);
  process.exit(1);
});