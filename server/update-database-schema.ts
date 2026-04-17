import Database from 'better-sqlite3';
import { resolve } from 'path';

/**
 * Script para atualizar o schema do banco de dados SQLite
 * para suportar múltiplas regiões por usuário
 */
async function updateDatabaseSchema() {
  console.log('🔄 Atualizando schema do banco de dados...');
  
  try {
    // Conectar ao banco de dados
    const dbPath = resolve('./server/okr.db');
    const db = new Database(dbPath);
    
    console.log('📊 Verificando estrutura atual da tabela users...');
    
    // Verificar se as colunas já existem
    const tableInfo = db.prepare("PRAGMA table_info(users)").all();
    const columnNames = tableInfo.map((col: any) => col.name);
    
    const hasRegionIds = columnNames.includes('region_ids');
    const hasSubRegionIds = columnNames.includes('sub_region_ids');
    
    if (hasRegionIds && hasSubRegionIds) {
      console.log('✅ Schema já está atualizado!');
      return;
    }
    
    console.log('🔧 Adicionando novas colunas para múltiplas regiões...');
    
    // Adicionar colunas region_ids e sub_region_ids se não existirem
    if (!hasRegionIds) {
      db.exec(`ALTER TABLE users ADD COLUMN region_ids TEXT DEFAULT '[]'`);
      console.log('✅ Coluna region_ids adicionada');
    }
    
    if (!hasSubRegionIds) {
      db.exec(`ALTER TABLE users ADD COLUMN sub_region_ids TEXT DEFAULT '[]'`);
      console.log('✅ Coluna sub_region_ids adicionada');
    }
    
    // Migrar dados existentes de region_id e sub_region_id para os arrays
    console.log('📦 Migrando dados existentes...');
    
    const usersWithOldData = db.prepare(`
      SELECT id, region_id, sub_region_id 
      FROM users 
      WHERE (region_id IS NOT NULL OR sub_region_id IS NOT NULL)
      AND (region_ids = '[]' OR region_ids IS NULL)
    `).all();
    
    console.log(`📋 Migrando ${usersWithOldData.length} usuários...`);
    
    const updateStmt = db.prepare(`
      UPDATE users 
      SET region_ids = ?, sub_region_ids = ? 
      WHERE id = ?
    `);
    
    for (const user of usersWithOldData) {
      const regionIds = user.region_id ? [user.region_id] : [];
      const subRegionIds = user.sub_region_id ? [user.sub_region_id] : [];
      
      updateStmt.run(
        JSON.stringify(regionIds),
        JSON.stringify(subRegionIds),
        user.id
      );
      
      console.log(`✅ Usuário ID ${user.id}: ${regionIds.length} regiões, ${subRegionIds.length} sub-regiões`);
    }
    
    console.log('🎉 Schema atualizado com sucesso!');
    console.log('📋 Resumo das mudanças:');
    console.log('   ✅ Colunas region_ids e sub_region_ids adicionadas');
    console.log(`   ✅ ${usersWithOldData.length} usuários migrados`);
    console.log('   ✅ Sistema agora suporta múltiplas regiões por usuário');
    
    db.close();
    
  } catch (error) {
    console.error('❌ Erro durante a atualização do schema:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  updateDatabaseSchema()
    .then(() => {
      console.log('✅ Atualização concluída com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Falha na atualização:', error);
      process.exit(1);
    });
}

export { updateDatabaseSchema };