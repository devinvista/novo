import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { 
  users, regions, subRegions, serviceLines, strategicIndicators, 
  objectives, keyResults, actions, checkpoints, activities,
  solutions, services
} from "@shared/schema";

const sqlite = new Database('okr.db');
const db = drizzle(sqlite, { 
  schema: { 
    users, regions, subRegions, serviceLines, strategicIndicators,
    objectives, keyResults, actions, checkpoints, activities,
    solutions, services
  } 
});

async function setupSQLite() {
  console.log('🔧 Configurando banco SQLite...');

  // Create tables using SQL directly
  const tableCreationSQL = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'operacional',
      region_id INTEGER,
      sub_region_id INTEGER,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS regions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      code TEXT NOT NULL UNIQUE
    )`,
    
    `CREATE TABLE IF NOT EXISTS sub_regions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      region_id INTEGER NOT NULL
    )`,
    
    `CREATE TABLE IF NOT EXISTS solutions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS service_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      solution_id INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      service_line_id INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS strategic_indicators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      unit TEXT,
      active INTEGER NOT NULL DEFAULT 1
    )`,
    
    `CREATE TABLE IF NOT EXISTS objectives (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      owner_id INTEGER NOT NULL,
      region_id INTEGER,
      sub_region_id INTEGER,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      progress REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS key_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      objective_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      number INTEGER NOT NULL,
      strategic_indicator_ids TEXT,
      service_line_id INTEGER,
      service_id INTEGER,
      initial_value REAL NOT NULL,
      target_value REAL NOT NULL,
      current_value REAL DEFAULT 0,
      unit TEXT,
      frequency TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      progress REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key_result_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      number INTEGER NOT NULL,
      strategic_indicator_id INTEGER,
      responsible_id INTEGER,
      due_date TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      priority TEXT NOT NULL DEFAULT 'medium',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS checkpoints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key_result_id INTEGER NOT NULL,
      period TEXT NOT NULL,
      target_value REAL NOT NULL,
      actual_value REAL,
      progress REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pendente',
      notes TEXT,
      completed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      description TEXT NOT NULL,
      old_values TEXT,
      new_values TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`
  ];

  for (const sql of tableCreationSQL) {
    sqlite.exec(sql);
  }

  console.log('✅ Tabelas criadas');

  // Seed basic data
  const seedData = {
    regions: [
      { name: 'Central', code: 'CEN' },
      { name: 'Departamento Regional', code: 'DR' },
      { name: 'Encosta da Serra', code: 'ES' },
      { name: 'Metropolitana', code: 'MET' },
      { name: 'Noroeste', code: 'NO' },
      { name: 'Norte', code: 'N' },
      { name: 'Serra', code: 'S' },
      { name: 'Sul', code: 'SU' },
      { name: 'Vale do Rio Pardo', code: 'VRP' },
      { name: 'Vale do Sinos', code: 'VS' },
      { name: 'Vale do Taquari', code: 'VT' }
    ],
    solutions: [
      { name: 'Educação', description: 'Soluções educacionais' },
      { name: 'Saúde', description: 'Soluções de saúde' }
    ],
    indicators: [
      { name: 'Sustentabilidade Operacional', description: 'Indicador de sustentabilidade das operações organizacionais', unit: '%' },
      { name: 'Receita de Serviços', description: 'Receita gerada através da prestação de serviços', unit: 'R$' },
      { name: 'Matrículas em Educação', description: 'Número de matrículas realizadas em programas educacionais', unit: 'unidades' },
      { name: 'Indústrias Atendidas em Saúde', description: 'Quantidade de indústrias atendidas pelos serviços de saúde', unit: 'unidades' },
      { name: 'Trabalhadores da Indústria Atendidos em Saúde', description: 'Número de trabalhadores industriais atendidos pelos serviços de saúde', unit: 'pessoas' },
      { name: 'Matrículas Presenciais com Mais de 4 Horas', description: 'Matrículas em cursos presenciais com carga horária superior a 4 horas', unit: 'unidades' },
      { name: 'Custo Hora Aluno', description: 'Custo por hora de cada aluno nos programas educacionais', unit: 'R$/hora' }
    ]
  };

  // Insert regions
  for (const region of seedData.regions) {
    sqlite.prepare('INSERT OR IGNORE INTO regions (name, code) VALUES (?, ?)').run(region.name, region.code);
  }

  // Insert solutions
  for (const solution of seedData.solutions) {
    sqlite.prepare('INSERT OR IGNORE INTO solutions (name, description) VALUES (?, ?)').run(solution.name, solution.description);
  }

  // Insert indicators
  for (const indicator of seedData.indicators) {
    sqlite.prepare('INSERT OR IGNORE INTO strategic_indicators (name, description, unit) VALUES (?, ?, ?)').run(indicator.name, indicator.description, indicator.unit);
  }

  // Insert service lines
  const serviceLines = [
    { name: 'Educação Básica', solution_id: 1 },
    { name: 'Educação Continuada', solution_id: 1 },
    { name: 'Evento', solution_id: 1 },
    { name: 'Atividade Física', solution_id: 2 },
    { name: 'Evento', solution_id: 2 },
    { name: 'Locação de Espaços', solution_id: 2 },
    { name: 'Normas Regulamentadoras', solution_id: 2 },
    { name: 'Nutrição', solution_id: 2 },
    { name: 'Odontologia', solution_id: 2 },
    { name: 'Parque SESI', solution_id: 2 },
    { name: 'Promoção da Saúde', solution_id: 2 },
    { name: 'Saúde Mental', solution_id: 2 },
    { name: 'Saúde Ocupacional', solution_id: 2 },
    { name: 'Segurança do Trabalho', solution_id: 2 },
    { name: 'Vacinação', solution_id: 2 }
  ];

  for (const sl of serviceLines) {
    sqlite.prepare('INSERT OR IGNORE INTO service_lines (name, solution_id) VALUES (?, ?)').run(sl.name, sl.solution_id);
  }

  console.log('✅ Dados básicos inseridos');
  
  // Create admin user
  const adminUser = {
    username: 'admin',
    password: 'admin123',
    name: 'Administrador SESI',
    email: 'admin@sesi.rs.gov.br',
    role: 'admin',
    region_id: 1,
    active: 1
  };

  sqlite.prepare(`INSERT OR IGNORE INTO users 
    (username, password, name, email, role, region_id, active) 
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    adminUser.username, adminUser.password, adminUser.name, 
    adminUser.email, adminUser.role, adminUser.region_id, adminUser.active
  );

  console.log('✅ Usuário admin criado');
  console.log('🎉 SQLite configurado com sucesso!');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  setupSQLite()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { setupSQLite };