import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import Database from 'better-sqlite3';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function fixUsersPasswords() {
  console.log('🔧 Corrigindo senhas dos usuários...');
  
  const sqlite = new Database('okr.db');
  
  try {
    // Buscar todos os usuários
    const users = sqlite.prepare('SELECT * FROM users').all() as any[];
    console.log(`👥 Encontrados ${users.length} usuários`);

    for (const user of users) {
      // Verificar se a senha já está hasheada (contém ponto)
      if (user.password.includes('.')) {
        console.log(`✓ ${user.username}: Senha já hasheada`);
        continue;
      }

      // Hash da senha simples
      const hashedPassword = await hashPassword(user.password);
      
      // Atualizar no banco
      sqlite.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, user.id);
      console.log(`🔐 ${user.username}: Senha hasheada (${user.password} -> hash)`);
    }

    // Criar novos usuários de teste com senhas hasheadas
    const testUsers = [
      { username: 'tom', password: 'tom123', name: 'Tom Silva', email: 'tom.silva@sesi.rs.gov.br', role: 'gestor', region_id: 1 },
      { username: 'maria', password: 'maria123', name: 'Maria Santos', email: 'maria.santos@sesi.rs.gov.br', role: 'operacional', region_id: 2 },
      { username: 'carlos', password: 'carlos123', name: 'Carlos Oliveira', email: 'carlos.oliveira@sesi.rs.gov.br', role: 'gestor', region_id: 3 }
    ];

    for (const userData of testUsers) {
      // Verificar se já existe
      const existing = sqlite.prepare('SELECT * FROM users WHERE username = ?').get(userData.username);
      if (existing) {
        console.log(`👤 ${userData.username}: Já existe`);
        continue;
      }

      // Hash da senha
      const hashedPassword = await hashPassword(userData.password);
      
      // Inserir usuário
      const stmt = sqlite.prepare(`
        INSERT INTO users (username, password, name, email, role, region_id, active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
      `);
      
      const result = stmt.run(
        userData.username,
        hashedPassword,
        userData.name,
        userData.email,
        userData.role,
        userData.region_id
      );

      console.log(`👤 ${userData.username}: Criado com senha hasheada`);
    }

    // Verificar usuários finais
    const finalUsers = sqlite.prepare('SELECT id, username, name, role FROM users').all();
    console.log('\n✅ Usuários configurados:');
    for (const user of finalUsers) {
      console.log(`  • ${user.name} (${user.username}) - ${user.role}`);
    }

    console.log('\n🎉 Senhas corrigidas com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao corrigir senhas:', error);
    throw error;
  } finally {
    sqlite.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fixUsersPasswords()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { fixUsersPasswords };