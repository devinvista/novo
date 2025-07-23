/**
 * Script para corrigir o schema MySQL usando comandos SQL diretos
 * para compatibilidade com Drizzle ORM
 */

import mysql from 'mysql2/promise';

async function fixMySQLSchema() {
  let connection;
  
  try {
    // Conectar diretamente ao MySQL
    connection = await mysql.createConnection({
      host: 'srv1661.hstgr.io',
      port: 3306,
      user: 'u905571261_okr',
      password: 'Okr2025$',
      database: 'u905571261_okr',
    });

    console.log('🔄 Conectado ao MySQL, corrigindo schema...');

    // 1. Verificar tabela key_results atual
    const [tables] = await connection.execute(`SHOW TABLES LIKE 'key_results'`);
    
    if ((tables as any[]).length === 0) {
      console.log('❌ Tabela key_results não encontrada');
      return;
    }

    // 2. Obter estrutura atual
    const [columns] = await connection.execute(`DESCRIBE key_results`);
    console.log('Estrutura atual da tabela:');
    console.table(columns);

    // 3. Corrigir colunas JSON se necessário
    const columnNames = (columns as any[]).map(col => col.Field);
    
    console.log('Colunas encontradas:', columnNames);

    // 4. Adicionar colunas se não existirem
    if (!columnNames.includes('strategicIndicatorIds')) {
      console.log('Adicionando coluna strategicIndicatorIds...');
      await connection.execute(`
        ALTER TABLE key_results 
        ADD COLUMN strategicIndicatorIds JSON DEFAULT ('[]')
      `);
    }

    if (!columnNames.includes('serviceLineIds')) {
      console.log('Adicionando coluna serviceLineIds...');
      await connection.execute(`
        ALTER TABLE key_results 
        ADD COLUMN serviceLineIds JSON DEFAULT ('[]')
      `);
    }

    // 5. Verificar novamente
    const [newColumns] = await connection.execute(`DESCRIBE key_results`);
    console.log('Nova estrutura:');
    console.table(newColumns);

    console.log('✅ Schema corrigido com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixMySQLSchema().catch(console.error);