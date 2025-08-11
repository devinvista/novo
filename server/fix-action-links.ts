import { storage } from './storage';

async function diagnoseActionLinks() {
  console.log('🔍 Diagnosing action-keyresult linkage issues...\n');
  
  try {
    // Get all actions
    const actions = await storage.getActions();
    console.log(`Found ${actions.length} total actions`);
    
    // Check for actions without key results
    const actionsWithoutKR = actions.filter(action => !action.keyResult || !action.keyResult.title);
    console.log(`Actions without proper key result linkage: ${actionsWithoutKR.length}`);
    
    if (actionsWithoutKR.length > 0) {
      console.log('\nActions with missing key result links:');
      actionsWithoutKR.forEach(action => {
        console.log(`- Action ID ${action.id}: "${action.title}" (keyResultId: ${action.keyResultId})`);
        console.log(`  keyResult object:`, action.keyResult);
      });
    }
    
    // Get all key results to verify they exist
    const keyResults = await storage.getKeyResults();
    console.log(`\nFound ${keyResults.length} total key results`);
    
    // Check if key result IDs from actions exist
    const actionKRIds = [...new Set(actions.map(a => a.keyResultId).filter(Boolean))];
    const existingKRIds = keyResults.map(kr => kr.id);
    
    console.log('\nKey Result ID analysis:');
    console.log(`Action references to KR IDs: [${actionKRIds.join(', ')}]`);
    console.log(`Existing KR IDs: [${existingKRIds.join(', ')}]`);
    
    const orphanedActionKRIds = actionKRIds.filter(id => !existingKRIds.includes(id));
    if (orphanedActionKRIds.length > 0) {
      console.log(`❌ Orphaned KR references: [${orphanedActionKRIds.join(', ')}]`);
    } else {
      console.log('✅ All action KR references are valid');
    }
    
    // Check if actions appear in the correct result for each key result
    console.log('\nKey Results and their linked actions:');
    for (const kr of keyResults.slice(0, 5)) { // Show first 5 for brevity
      const krActions = actions.filter(action => action.keyResultId === kr.id);
      console.log(`- KR ${kr.id}: "${kr.title}" has ${krActions.length} actions`);
      if (krActions.length > 0) {
        krActions.forEach(action => {
          console.log(`  └─ Action: "${action.title}" (${action.status})`);
        });
      }
    }
    
  } catch (error) {
    console.error('Error diagnosing action links:', error);
  }
}

// Run diagnosis
diagnoseActionLinks().then(() => {
  console.log('\n✅ Diagnosis complete');
}).catch(console.error);