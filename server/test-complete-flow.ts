// Complete flow test: Objectives -> Key Results -> Actions -> Checkpoints -> Dashboard
import { storage } from './mysql-storage-optimized';

async function testCompleteFlow() {
  try {
    console.log('=== TESTING COMPLETE OKR FLOW ===');
    
    // 1. Test user authentication and data access
    console.log('\n1. Testing user access...');
    const user = await storage.getUser(10); // ale user
    console.log('User:', user ? `${user.username} (${user.role}) - Regions: ${JSON.stringify(user.regionIds)}` : 'NOT FOUND');
    
    // 2. Test objectives loading
    console.log('\n2. Testing objectives...');
    const objectives = await storage.getObjectives({ currentUserId: 10 });
    console.log(`Objectives found: ${objectives.length}`);
    objectives.forEach((obj, i) => {
      console.log(`  ${i+1}. ID:${obj.id} "${obj.title}" (Region:${obj.regionId})`);
    });
    
    if (objectives.length === 0) {
      console.log('❌ No objectives found - this will cause dashboard to be empty');
      return;
    }
    
    // 3. Test key results for each objective
    console.log('\n3. Testing key results...');
    let totalKRs = 0;
    for (const objective of objectives) {
      const krs = await storage.getKeyResults({ objectiveId: objective.id, currentUserId: 10 });
      console.log(`  Objective ${objective.id}: ${krs.length} key results`);
      totalKRs += krs.length;
    }
    
    // 4. Test actions
    console.log('\n4. Testing actions...');
    const allActions = await storage.getActions({ currentUserId: 10 });
    console.log(`Total actions found: ${allActions.length}`);
    
    // 5. Test dashboard KPIs
    console.log('\n5. Testing dashboard KPIs...');
    const kpis = await storage.getDashboardKPIs(10);
    console.log('Dashboard KPIs:', JSON.stringify(kpis, null, 2));
    
    // 6. Test quarterly data
    console.log('\n6. Testing quarterly data...');
    const quarterlyData = await storage.getQuarterlyData('all', { currentUserId: 10 });
    console.log('Quarterly data:', JSON.stringify(quarterlyData, null, 2));
    
    // 7. Test quarters
    console.log('\n7. Testing available quarters...');
    const quarters = await storage.getAvailableQuarters();
    console.log(`Available quarters: ${quarters.length}`);
    quarters.forEach(q => console.log(`  - ${q.id}: ${q.name}`));
    
    console.log('\n=== ANALYSIS ===');
    console.log(`✓ User has access to ${objectives.length} objectives`);
    console.log(`✓ Total key results: ${totalKRs}`);
    console.log(`✓ Total actions: ${allActions.length}`);
    console.log(`✓ Dashboard KPIs show ${kpis.objectives} objectives`);
    console.log(`✓ Available quarters: ${quarters.length}`);
    
    if (objectives.length > 0 && kpis.objectives === 0) {
      console.log('❌ ISSUE: Objectives exist but dashboard shows 0');
    }
    
    if (quarters.length === 0) {
      console.log('❌ ISSUE: No quarters available - period filter will be empty');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCompleteFlow().then(() => {
  console.log('\n=== TEST COMPLETE ===');
  process.exit(0);
}).catch(console.error);