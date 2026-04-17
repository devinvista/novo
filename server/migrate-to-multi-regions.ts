import { db } from './db.js';
import { users } from '../shared/sqlite-schema.js';
import { sql } from 'drizzle-orm';

/**
 * Script para migrar usuários existentes do sistema de região única
 * para o novo sistema de múltiplas regiões
 */
async function migrateToMultiRegions() {
  console.log('🔄 Iniciando migração para sistema multi-regional...');
  
  try {
    // Buscar todos os usuários com regionId ou subRegionId definidos
    const usersToMigrate = await db
      .select()
      .from(users)
      .where(sql`region_id IS NOT NULL OR sub_region_id IS NOT NULL`);
    
    console.log(`📊 Encontrados ${usersToMigrate.length} usuários para migrar`);
    
    for (const user of usersToMigrate) {
      const regionIds: number[] = [];
      const subRegionIds: number[] = [];
      
      // Converter regionId único para array
      if (user.regionId) {
        regionIds.push(user.regionId);
      }
      
      // Converter subRegionId único para array
      if (user.subRegionId) {
        subRegionIds.push(user.subRegionId);
      }
      
      // Atualizar usuário com arrays
      await db
        .update(users)
        .set({
          regionIds: JSON.stringify(regionIds),
          subRegionIds: JSON.stringify(subRegionIds),
        })
        .where(sql`id = ${user.id}`);
      
      console.log(`✅ Usuário ${user.username} migrado: ${regionIds.length} regiões, ${subRegionIds.length} sub-regiões`);
    }
    
    console.log('🎉 Migração concluída com sucesso!');
    console.log('📋 Próximos passos:');
    console.log('   1. Verifique se todos os usuários foram migrados corretamente');
    console.log('   2. Teste o sistema de controle de acesso multi-regional');
    console.log('   3. Configure usuários adicionais conforme necessário');
    
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    throw error;
  }
}

// Executar migração se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateToMultiRegions()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Falha na migração:', error);
      process.exit(1);
    });
}

export { migrateToMultiRegions };