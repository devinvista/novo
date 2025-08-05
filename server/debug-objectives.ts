// Debug script to test objectives functionality
import { storage } from './mysql-storage-optimized';

async function debugObjectives() {
  try {
    console.log('=== DEBUGGING OBJECTIVES LOADING ===');
    
    // Test 1: Get user info
    console.log('\n1. Testing user retrieval...');
    const user = await storage.getUser(10); // ale user ID
    console.log('User found:', user ? `${user.username} (${user.role})` : 'NOT FOUND');
    console.log('User regions:', user?.regionIds);
    
    // Test 2: Get all objectives without filters
    console.log('\n2. Testing objectives without filters...');
    const allObjectives = await storage.getObjectives();
    console.log(`Total objectives found: ${allObjectives.length}`);
    
    // Test 3: Get objectives with user filters
    console.log('\n3. Testing objectives with user filters...');
    const userObjectives = await storage.getObjectives({ currentUserId: 10 });
    console.log(`User objectives found: ${userObjectives.length}`);
    
    if (userObjectives.length > 0) {
      console.log('First objective:', {
        id: userObjectives[0].id,
        title: userObjectives[0].title,
        regionId: userObjectives[0].regionId,
        ownerId: userObjectives[0].ownerId
      });
    }
    
    // Test 4: Direct database query
    console.log('\n4. Testing direct database query...');
    const { db } = await import('./mysql-db');
    const { objectives } = await import('@shared/mysql-schema-final');
    const directResults = await db.select().from(objectives).limit(5);
    console.log(`Direct query results: ${directResults.length}`);
    
    if (directResults.length > 0) {
      console.log('Sample objective from direct query:', {
        id: directResults[0].id,
        title: directResults[0].title,
        regionId: directResults[0].regionId
      });
    }
    
  } catch (error) {
    console.error('Debug error:', error);
  }
}

debugObjectives().then(() => {
  console.log('\n=== DEBUG COMPLETE ===');
  process.exit(0);
}).catch(console.error);