import { db } from "./mysql-db";
import { keyResults } from "@shared/mysql-schema-final";
import { eq } from "drizzle-orm";

async function fixProgressField() {
  console.log('🔄 Fixing progress field for Key Result Teste...');
  
  try {
    // Get the specific Key Result
    const kr = await db.select().from(keyResults).where(eq(keyResults.title, 'Key Result Teste'));
    
    if (kr.length > 0) {
      const keyResult = kr[0];
      console.log(`📊 Current data for "${keyResult.title}":`);
      console.log(`   - currentValue: ${keyResult.currentValue}`);
      console.log(`   - targetValue: ${keyResult.targetValue}`);
      console.log(`   - progress: ${keyResult.progress}`);
      
      const current = parseFloat(keyResult.currentValue) || 0;
      const target = parseFloat(keyResult.targetValue) || 1;
      const newProgress = target > 0 ? (current / target) * 100 : 0;
      
      console.log(`🧮 Calculating: ${current} / ${target} * 100 = ${newProgress.toFixed(2)}%`);
      
      // Update the progress field
      await db.update(keyResults).set({
        progress: newProgress.toFixed(2),
        updatedAt: new Date()
      }).where(eq(keyResults.id, keyResult.id));
      
      console.log(`✅ Updated progress from ${keyResult.progress}% to ${newProgress.toFixed(2)}%`);
    } else {
      console.log('❌ Key Result Teste not found');
    }
    
    console.log('🎉 Progress field fixed successfully!');
  } catch (error) {
    console.error('❌ Error fixing progress field:', error);
    throw error;
  }
}

// Execute the fix
fixProgressField().then(() => {
  console.log('✅ Fix completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Fix failed:', error);
  process.exit(1);
});