/**
 * Script para atualizar o schema do banco MySQL para corresponder ao schema atual
 * Corrige nomes de colunas JSON e estrutura das tabelas
 */

import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'srv1661.hstgr.io',
  port: 3306,
  user: 'u905571261_okr',
  password: 'Okr@2025!secure',
  database: 'u905571261_okr',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function updateMySQLSchema() {
  try {
    console.log('🔄 Iniciando atualização do schema MySQL...');

    // 1. Verificar e corrigir colunas JSON em key_results
    console.log('1. Verificando estrutura da tabela key_results...');
    
    const [columns] = await pool.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'u905571261_okr' 
      AND TABLE_NAME = 'key_results'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('Colunas atuais:', columns);

    // 2. Verificar se as colunas JSON existem com nomes corretos
    const columnNames = (columns as any[]).map(col => col.COLUMN_NAME);
    
    if (!columnNames.includes('strategicIndicatorIds')) {
      console.log('2. Adicionando coluna strategicIndicatorIds...');
      await pool.execute(`
        ALTER TABLE key_results 
        ADD COLUMN strategicIndicatorIds JSON DEFAULT ('[]')
      `);
    }

    if (!columnNames.includes('serviceLineIds')) {
      console.log('3. Adicionando coluna serviceLineIds...');
      await pool.execute(`
        ALTER TABLE key_results 
        ADD COLUMN serviceLineIds JSON DEFAULT ('[]')
      `);
    }

    // 3. Remover colunas antigas se existirem
    if (columnNames.includes('strategic_indicator_ids')) {
      console.log('4. Removendo coluna antiga strategic_indicator_ids...');
      await pool.execute(`
        ALTER TABLE key_results 
        DROP COLUMN strategic_indicator_ids
      `);
    }

    if (columnNames.includes('service_line_ids')) {
      console.log('5. Removendo coluna antiga service_line_ids...');
      await pool.execute(`
        ALTER TABLE key_results 
        DROP COLUMN service_line_ids
      `);
    }

    if (columnNames.includes('service_line_id')) {
      console.log('6. Removendo coluna antiga service_line_id...');
      await pool.execute(`
        ALTER TABLE key_results 
        DROP COLUMN service_line_id
      `);
    }

    // 4. Garantir que initialValue seja mapeado para current_value
    if (!columnNames.includes('current_value')) {
      console.log('7. Adicionando coluna current_value...');
      await pool.execute(`
        ALTER TABLE key_results 
        ADD COLUMN current_value DECIMAL(15,2) DEFAULT 0 AFTER target_value
      `);
    }

    // 5. Verificar estrutura final
    console.log('8. Verificando estrutura final...');
    const [finalColumns] = await pool.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'u905571261_okr' 
      AND TABLE_NAME = 'key_results'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('Estrutura final da tabela key_results:');
    console.table(finalColumns);

    // 6. Atualizar dados antigos se necessário
    console.log('9. Atualizando dados existentes...');
    await pool.execute(`
      UPDATE key_results 
      SET strategicIndicatorIds = '[]' 
      WHERE strategicIndicatorIds IS NULL
    `);
    
    await pool.execute(`
      UPDATE key_results 
      SET serviceLineIds = '[]' 
      WHERE serviceLineIds IS NULL
    `);

    console.log('✅ Schema MySQL atualizado com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao atualizar schema:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Executar se for chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  updateMySQLSchema().catch(console.error);
}

export { updateMySQLSchema };