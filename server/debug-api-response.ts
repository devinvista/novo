import { db } from "./mysql-db";
import { keyResults } from "@shared/mysql-schema-final";
import { eq } from "drizzle-orm";

async function debugApiResponse() {
  console.log('🔍 Debugging API response for Key Result Teste...');
  
  try {
    // Get the data directly from database
    const kr = await db.select().from(keyResults).where(eq(keyResults.title, 'Key Result Teste'));
    
    if (kr.length > 0) {
      const keyResult = kr[0];
      console.log('📊 Database data:');
      console.log(`- progress: "${keyResult.progress}" (type: ${typeof keyResult.progress})`);
      console.log(`- currentValue: "${keyResult.currentValue}" (type: ${typeof keyResult.currentValue})`);
      console.log(`- targetValue: "${keyResult.targetValue}" (type: ${typeof keyResult.targetValue})`);
      
      console.log('\n🧮 Frontend parsing simulation:');
      console.log(`- parseFloat(kr.progress): ${parseFloat(keyResult.progress)}`);
      console.log(`- parseFloat(kr.progress) || 0: ${parseFloat(keyResult.progress) || 0}`);
      console.log(`- isNaN(parseFloat(kr.progress)): ${isNaN(parseFloat(keyResult.progress))}`);
      
      // Test if the issue is with the formatting
      const progressValue = keyResult.progress;
      console.log('\n🔧 Testing different parsing methods:');
      console.log(`- Number(progressValue): ${Number(progressValue)}`);
      console.log(`- +progressValue: ${+progressValue}`);
      console.log(`- parseFloat(String(progressValue)): ${parseFloat(String(progressValue))}`);
    } else {
      console.log('❌ Key Result Teste not found in database');
    }
    
  } catch (error) {
    console.error('❌ Error debugging API response:', error);
    throw error;
  }
}

// Execute the debug
debugApiResponse().then(() => {
  console.log('✅ Debug completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Debug failed:', error);
  process.exit(1);
});