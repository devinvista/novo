import { db } from './mysql-db';
import { keyResults, serviceLines } from '@shared/mysql-schema';
import { eq } from 'drizzle-orm';

async function fixServiceLineAssociations() {
  try {
    console.log('🔧 Fixing Service Line Associations for Key Results');
    
    // Get all service lines first
    const allServiceLines = await db.select().from(serviceLines);
    console.log('📋 Available Service Lines:');
    allServiceLines.forEach(sl => console.log(`  ${sl.id}: ${sl.name}`));
    
    // Get all key results
    const allKRs = await db.select().from(keyResults);
    console.log(`\n📋 Found ${allKRs.length} Key Results to analyze`);
    
    // Define associations based on key result content
    const associations = [
      { keyword: 'Vacinação', serviceLineId: 15, serviceName: 'Saúde Ocupacional' },
      { keyword: 'Saúde Ocupacional', serviceLineId: 15, serviceName: 'Saúde Ocupacional' },
      { keyword: 'Nutrição', serviceLineId: 14, serviceName: 'Nutrição' },
      { keyword: 'Atividades Físicas', serviceLineId: 4, serviceName: 'Atividade Física' },
      { keyword: 'NRs', serviceLineId: 15, serviceName: 'Saúde Ocupacional' },
      { keyword: 'Pilates', serviceLineId: 4, serviceName: 'Atividade Física' },
      { keyword: 'bioimpedância', serviceLineId: 14, serviceName: 'Nutrição' }
    ];
    
    let updatedCount = 0;
    
    for (const kr of allKRs) {
      let assignedServiceLineId = null;
      let matchedKeyword = '';
      
      // Find matching association
      for (const assoc of associations) {
        if (kr.title?.toLowerCase().includes(assoc.keyword.toLowerCase())) {
          assignedServiceLineId = assoc.serviceLineId;
          matchedKeyword = assoc.keyword;
          break;
        }
      }
      
      // Update if we found a match and it's different from current
      if (assignedServiceLineId && kr.serviceLineId !== assignedServiceLineId) {
        await db.update(keyResults)
          .set({ serviceLineId: assignedServiceLineId })
          .where(eq(keyResults.id, kr.id));
        
        console.log(`✅ Updated KR "${kr.title?.substring(0, 50)}..." -> Service Line ${assignedServiceLineId} (${matchedKeyword})`);
        updatedCount++;
      } else if (assignedServiceLineId && kr.serviceLineId === assignedServiceLineId) {
        console.log(`✓ KR "${kr.title?.substring(0, 50)}..." already has correct Service Line ${assignedServiceLineId}`);
      } else {
        console.log(`⚠️  No association found for KR "${kr.title?.substring(0, 50)}..."`);
      }
    }
    
    console.log(`\n🎉 Fixed ${updatedCount} Key Result associations`);
    
    // Verify the fix
    console.log('\n🔍 Verification - Key Results with "Vacinação":');
    const vaccinationKRs = await db.select({
      id: keyResults.id,
      title: keyResults.title,
      serviceLineId: keyResults.serviceLineId
    }).from(keyResults);
    
    const vacinacaoResults = vaccinationKRs.filter(kr => kr.title?.includes('Vacinação'));
    vacinacaoResults.forEach(kr => {
      console.log(`  ${kr.id}: "${kr.title}" -> Service Line ${kr.serviceLineId}`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing service line associations:', error);
  } finally {
    process.exit(0);
  }
}

fixServiceLineAssociations();