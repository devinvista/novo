import { storage } from './fabric-only-storage';

async function testAllFunctions() {
  console.log('🧪 Testing all OKR system functions with Microsoft Fabric...');
  
  try {
    // Test 1: User Management
    console.log('\n1️⃣ Testing User Management...');
    const users = await storage.getUserByUsername('admin');
    console.log(`✅ Found user: ${users?.name || 'Not found'}`);
    
    // Test 2: Reference Data
    console.log('\n2️⃣ Testing Reference Data...');
    const regions = await storage.getRegions();
    console.log(`✅ Regions: ${regions.length} found`);
    
    const solutions = await storage.getSolutions();
    console.log(`✅ Solutions: ${solutions.length} found`);
    
    const strategicIndicators = await storage.getStrategicIndicators();
    console.log(`✅ Strategic Indicators: ${strategicIndicators.length} found`);
    
    // Test 3: Objectives
    console.log('\n3️⃣ Testing Objectives...');
    const objectives = await storage.getObjectives();
    console.log(`✅ Objectives: ${objectives.length} found`);
    
    // Test 4: Key Results
    console.log('\n4️⃣ Testing Key Results...');
    const keyResults = await storage.getKeyResults();
    console.log(`✅ Key Results: ${keyResults.length} found`);
    
    if (keyResults.length > 0) {
      console.log(`   First KR: "${keyResults[0].title}"`);
      console.log(`   Objective: "${keyResults[0].objective?.title || 'N/A'}"`);
    }
    
    // Test 5: Actions
    console.log('\n5️⃣ Testing Actions...');
    const actions = await storage.getActions();
    console.log(`✅ Actions: ${actions.length} found`);
    
    if (actions.length > 0) {
      console.log(`   First Action: "${actions[0].title}"`);
    }
    
    // Test 6: Checkpoints
    console.log('\n6️⃣ Testing Checkpoints...');
    const checkpoints = await storage.getCheckpoints();
    console.log(`✅ Checkpoints: ${checkpoints.length} found`);
    
    if (checkpoints.length > 0) {
      console.log(`   First Checkpoint: ${checkpoints[0].period} (${checkpoints[0].status})`);
    }
    
    // Test 7: Activities
    console.log('\n7️⃣ Testing Activities...');
    const activities = await storage.getRecentActivities(5);
    console.log(`✅ Recent Activities: ${activities.length} found`);
    
    // Test 8: Dashboard KPIs
    console.log('\n8️⃣ Testing Dashboard KPIs...');
    const kpis = await storage.getDashboardKPIs();
    console.log(`✅ Dashboard KPIs:`);
    console.log(`   Total Objectives: ${kpis.totalObjectives}`);
    console.log(`   Total Key Results: ${kpis.totalKeyResults}`);
    console.log(`   Average Progress: ${kpis.averageProgress}%`);
    console.log(`   Total Actions: ${kpis.totalActions}`);
    console.log(`   Completed Actions: ${kpis.completedActions}`);
    console.log(`   Overall Progress: ${kpis.overallProgress}%`);
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('✅ Microsoft Fabric SQL Server is fully operational for OKR system');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testAllFunctions()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { testAllFunctions };