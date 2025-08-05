import { db } from './mysql-db';
import { sql } from 'drizzle-orm';

async function migrateSubRegionsToArray() {
  console.log('🔄 Iniciando migração de sub-regiões para array...');
  
  try {
    // 1. Verificar se a coluna já existe
    console.log('1. Verificando estrutura da tabela...');
    
    // 2. Migrar os dados existentes de sub_region_id para sub_region_ids
    console.log('2. Migrando dados existentes...');
    await db.execute(sql`
      UPDATE objectives 
      SET sub_region_ids = JSON_ARRAY(sub_region_id) 
      WHERE sub_region_id IS NOT NULL
    `);
    
    // 3. Verificar os dados migrados
    console.log('3. Verificando migração...');
    const results = await db.execute(sql`
      SELECT id, title, sub_region_id, sub_region_ids 
      FROM objectives 
      WHERE sub_region_id IS NOT NULL 
      LIMIT 5
    `);
    
    console.log('Dados migrados:', results);
    
    // 4. Verificar e remover constraints existentes
    console.log('4. Verificando constraints existentes...');
    try {
      // Tentar diferentes nomes possíveis para a constraint
      await db.execute(sql`
        ALTER TABLE objectives 
        DROP FOREIGN KEY objectives_ibfk_2
      `);
    } catch (e1) {
      try {
        await db.execute(sql`
          ALTER TABLE objectives 
          DROP FOREIGN KEY fk_objectives_sub_region
        `);
      } catch (e2) {
        console.log('Nenhuma constraint encontrada ou já removida');
      }
    }
    
    console.log('5. Removendo coluna antiga sub_region_id...');
    await db.execute(sql`
      ALTER TABLE objectives 
      DROP COLUMN sub_region_id
    `);
    
    console.log('✅ Migração concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    throw error;
  }
}

// Executar a migração se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateSubRegionsToArray().then(() => {
    console.log('Migração finalizada');
    process.exit(0);
  }).catch((error) => {
    console.error('Erro na migração:', error);
    process.exit(1);
  });
}

export { migrateSubRegionsToArray };