// Test script for all Microsoft Fabric functions
import { storage } from './hybrid-storage';

async function testAllFunctions() {
  console.log('🧪 Testing all OKR system functions...');
  
  try {
    // Test user creation and management
    console.log('\n1. Testing User Management...');
    const testUser = await storage.createUser({
      username: 'test_fabric',
      password: 'test123',
      name: 'Test User Fabric',
      email: 'test@fabric.com',
      role: 'admin',
      regionId: 1,
      subRegionId: 1,
      active: true,
      createdAt: new Date().toISOString()
    });
    console.log('✅ User created:', testUser.name);

    const foundUser = await storage.getUserByUsername('test_fabric');
    console.log('✅ User found by username:', foundUser?.name);

    // Test reference data
    console.log('\n2. Testing Reference Data...');
    const regions = await storage.getRegions();
    console.log('✅ Regions loaded:', regions.length);

    const subRegions = await storage.getSubRegions();
    console.log('✅ Sub-regions loaded:', subRegions.length);

    const solutions = await storage.getSolutions();
    console.log('✅ Solutions loaded:', solutions.length);

    const serviceLines = await storage.getServiceLines();
    console.log('✅ Service lines loaded:', serviceLines.length);

    const strategicIndicators = await storage.getStrategicIndicators();
    console.log('✅ Strategic indicators loaded:', strategicIndicators.length);

    // Test objectives
    console.log('\n3. Testing Objectives...');
    const objective = await storage.createObjective({
      title: 'Test Objective for Fabric',
      description: 'Testing Microsoft Fabric integration',
      ownerId: testUser.id!,
      regionId: 1,
      subRegionId: 1,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    console.log('✅ Objective created:', objective.title);

    const objectives = await storage.getObjectives();
    console.log('✅ Objectives loaded:', objectives.length);

    // Test key results
    console.log('\n4. Testing Key Results...');
    const keyResult = await storage.createKeyResult({
      objectiveId: objective.id!,
      title: 'Test Key Result for Fabric',
      description: 'Testing Microsoft Fabric KR',
      strategicIndicatorIds: '[1,2]',
      serviceLineId: 1,
      serviceId: 1,
      initialValue: 0,
      targetValue: 100,
      currentValue: 0,
      unit: 'units',
      frequency: 'monthly',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      progress: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    console.log('✅ Key Result created:', keyResult.title);

    const keyResults = await storage.getKeyResults();
    console.log('✅ Key Results loaded:', keyResults.length);

    // Test actions
    console.log('\n5. Testing Actions...');
    const action = await storage.createAction({
      keyResultId: keyResult.id!,
      title: 'Test Action for Fabric',
      description: 'Testing Microsoft Fabric action',
      strategicIndicatorId: 1,
      responsibleId: testUser.id!,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
      priority: 'high',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    console.log('✅ Action created:', action.title);

    const actions = await storage.getActions();
    console.log('✅ Actions loaded:', actions.length);

    // Test checkpoints
    console.log('\n6. Testing Checkpoints...');
    const checkpoints = await storage.generateCheckpoints(keyResult.id!);
    console.log('✅ Checkpoints generated:', checkpoints.length);

    const checkpoint = await storage.updateCheckpoint(checkpoints[0].id!, {
      actualValue: 25,
      progress: 25,
      status: 'no_prazo',
      notes: 'First checkpoint update'
    });
    console.log('✅ Checkpoint updated:', checkpoint.period);

    // Test activities
    console.log('\n7. Testing Activities...');
    await storage.logActivity({
      userId: testUser.id!,
      entityType: 'objective',
      entityId: objective.id!,
      action: 'created',
      description: 'Test objective created for Fabric testing',
      newValues: { title: objective.title }
    });

    const activities = await storage.getRecentActivities(5);
    console.log('✅ Activities logged:', activities.length);

    // Test dashboard KPIs
    console.log('\n8. Testing Dashboard KPIs...');
    const kpis = await storage.getDashboardKPIs();
    console.log('✅ Dashboard KPIs:', kpis);

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Users: ${foundUser ? 1 : 0}`);
    console.log(`- Regions: ${regions.length}`);
    console.log(`- Sub-regions: ${subRegions.length}`);
    console.log(`- Solutions: ${solutions.length}`);
    console.log(`- Service Lines: ${serviceLines.length}`);
    console.log(`- Strategic Indicators: ${strategicIndicators.length}`);
    console.log(`- Objectives: ${objectives.length}`);
    console.log(`- Key Results: ${keyResults.length}`);
    console.log(`- Actions: ${actions.length}`);
    console.log(`- Checkpoints: ${checkpoints.length}`);
    console.log(`- Activities: ${activities.length}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
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

export default testAllFunctions;