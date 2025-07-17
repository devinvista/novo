import Database from 'better-sqlite3';
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function initDatabase() {
  console.log("🔧 Inicializando banco de dados SQLite...");
  
  const db = new Database('./okr.db');
  
  try {
    // Criar tabelas
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
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
      );

      CREATE TABLE IF NOT EXISTS regions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        code TEXT NOT NULL UNIQUE
      );

      CREATE TABLE IF NOT EXISTS sub_regions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        region_id INTEGER NOT NULL,
        FOREIGN KEY (region_id) REFERENCES regions(id)
      );

      CREATE TABLE IF NOT EXISTS solutions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS service_lines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        solution_id INTEGER NOT NULL,
        FOREIGN KEY (solution_id) REFERENCES solutions(id)
      );

      CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        service_line_id INTEGER NOT NULL,
        FOREIGN KEY (service_line_id) REFERENCES service_lines(id)
      );

      CREATE TABLE IF NOT EXISTS strategic_indicators (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        unit TEXT
      );

      CREATE TABLE IF NOT EXISTS objectives (
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
        period TEXT,
        service_line_id INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id),
        FOREIGN KEY (region_id) REFERENCES regions(id),
        FOREIGN KEY (sub_region_id) REFERENCES sub_regions(id)
      );

      CREATE TABLE IF NOT EXISTS key_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        objective_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        target_value REAL NOT NULL,
        current_value REAL DEFAULT 0,
        unit TEXT,
        strategic_indicator_ids TEXT NOT NULL,
        service_line_id INTEGER,
        service_id INTEGER,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        frequency TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        progress REAL DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (objective_id) REFERENCES objectives(id),
        FOREIGN KEY (service_line_id) REFERENCES service_lines(id),
        FOREIGN KEY (service_id) REFERENCES services(id)
      );

      CREATE TABLE IF NOT EXISTS actions (
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
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (key_result_id) REFERENCES key_results(id),
        FOREIGN KEY (strategic_indicator_id) REFERENCES strategic_indicators(id),
        FOREIGN KEY (responsible_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS checkpoints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key_result_id INTEGER NOT NULL,
        period TEXT NOT NULL,
        target_value REAL NOT NULL,
        actual_value REAL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending',
        notes TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (key_result_id) REFERENCES key_results(id)
      );
    `);

    console.log("✅ Tabelas criadas com sucesso");

    // Limpar dados existentes
    db.exec(`
      DELETE FROM checkpoints;
      DELETE FROM actions;
      DELETE FROM key_results;
      DELETE FROM objectives;
      DELETE FROM users;
      DELETE FROM services;
      DELETE FROM service_lines;
      DELETE FROM solutions;
      DELETE FROM strategic_indicators;
      DELETE FROM sub_regions;
      DELETE FROM regions;
    `);

    // Inserir dados básicos
    const insertRegion = db.prepare('INSERT INTO regions (id, name, code) VALUES (?, ?, ?)');
    const regions = [
      [1, "Região Metropolitana", "RM"],
      [2, "Serra", "SE"],
      [3, "Sul", "SU"],
      [4, "Norte", "NO"],
      [5, "Nordeste", "NE"],
      [6, "Noroeste", "NW"],
      [7, "Centro-Oeste", "CO"],
      [8, "Sudoeste", "SW"],
      [9, "Centro", "CE"],
      [10, "Fronteira Oeste", "FO"],
      [11, "Litoral Norte", "LN"]
    ];
    regions.forEach(region => insertRegion.run(...region));
    console.log("✅ Regiões inseridas");

    const insertSubRegion = db.prepare('INSERT INTO sub_regions (id, region_id, name, code) VALUES (?, ?, ?, ?)');
    const subRegions = [
      [1, 1, "Grande Porto Alegre", "GPA"],
      [2, 1, "Pareci Novo", "PN"],
      [3, 2, "Caxias do Sul", "CS"],
      [4, 2, "Gramado-Canela", "GC"],
      [5, 3, "Pelotas", "PE"],
      [6, 3, "Camaquã", "CA"],
      [7, 4, "Passo Fundo", "PF"],
      [8, 4, "Erechim", "ER"],
      [9, 5, "Bento Gonçalves", "BG"],
      [10, 5, "Lajeado-Estrela", "LE"],
      [11, 6, "Santa Rosa", "SR"],
      [12, 6, "Ijuí", "IJ"],
      [13, 7, "Santa Maria", "SM"],
      [14, 7, "Santiago", "SA"],
      [15, 8, "Bagé", "BA"],
      [16, 8, "Santana do Livramento", "SL"],
      [17, 9, "Cachoeira do Sul", "CS2"],
      [18, 10, "Alegrete", "AL"],
      [19, 10, "Uruguaiana", "UR"],
      [20, 11, "Osório", "OS"],
      [21, 11, "Torres", "TO"]
    ];
    subRegions.forEach(subRegion => insertSubRegion.run(...subRegion));
    console.log("✅ Sub-regiões inseridas");

    const insertSolution = db.prepare('INSERT INTO solutions (id, name, description) VALUES (?, ?, ?)');
    insertSolution.run(1, "Educação", "Soluções educacionais e capacitação profissional");
    insertSolution.run(2, "Saúde", "Serviços de saúde e segurança do trabalho");
    console.log("✅ Soluções inseridas");

    const insertServiceLine = db.prepare('INSERT INTO service_lines (id, solution_id, name, description) VALUES (?, ?, ?, ?)');
    const serviceLines = [
      [1, 1, "Educação Básica", "Ensino fundamental e médio"],
      [2, 1, "Educação Profissional", "Cursos técnicos e profissionalizantes"],
      [3, 1, "Educação Superior", "Graduação e pós-graduação"],
      [4, 1, "Educação Continuada", "Capacitação e atualização profissional"],
      [5, 2, "Saúde Ocupacional", "Medicina e segurança do trabalho"],
      [6, 2, "Promoção da Saúde", "Programas de bem-estar e qualidade de vida"],
      [7, 2, "Reabilitação", "Fisioterapia e reabilitação profissional"]
    ];
    serviceLines.forEach(serviceLine => insertServiceLine.run(...serviceLine));
    console.log("✅ Linhas de serviço inseridas");

    const insertService = db.prepare('INSERT INTO services (id, service_line_id, name, description) VALUES (?, ?, ?, ?)');
    const services = [
      [1, 1, "Ensino Fundamental", "Educação básica - 1º ao 9º ano"],
      [2, 1, "Ensino Médio", "Educação básica - 1º ao 3º ano"],
      [3, 2, "Cursos Técnicos", "Formação técnica profissionalizante"],
      [4, 2, "Aprendizagem Industrial", "Programas de aprendizagem"],
      [5, 3, "Graduação Tecnológica", "Cursos superiores de tecnologia"],
      [6, 3, "Pós-Graduação", "Especialização e MBA"],
      [7, 4, "Capacitação Corporativa", "Treinamentos empresariais"],
      [8, 5, "Exames Ocupacionais", "Medicina do trabalho"],
      [9, 6, "Programas de Bem-estar", "Qualidade de vida no trabalho"],
      [10, 7, "Fisioterapia", "Reabilitação física"]
    ];
    services.forEach(service => insertService.run(...service));
    console.log("✅ Serviços inseridos");

    const insertIndicator = db.prepare('INSERT INTO strategic_indicators (id, name, description) VALUES (?, ?, ?)');
    const indicators = [
      [1, "Sustentabilidade Operacional", "Indicador de sustentabilidade das operações"],
      [2, "Receita de Serviços", "Receita gerada pelos serviços prestados"],
      [3, "Matrículas em Educação", "Número de alunos matriculados"],
      [4, "Indústrias Atendidas em Saúde", "Empresas atendidas nos serviços de saúde"],
      [5, "Trabalhadores da Indústria Atendidos em Saúde", "Trabalhadores atendidos"],
      [6, "Matrículas Presenciais com Mais de 4 Horas", "Matrículas em cursos presenciais longos"],
      [7, "Custo Hora Aluno", "Custo por hora de ensino por aluno"]
    ];
    indicators.forEach(indicator => insertIndicator.run(...indicator));
    console.log("✅ Indicadores estratégicos inseridos");

    // Criar usuários administradores
    const admin1Password = await hashPassword("admin123");
    const admin2Password = await hashPassword("admin456");

    const insertUser = db.prepare('INSERT INTO users (username, name, email, password, role) VALUES (?, ?, ?, ?, ?)');
    
    insertUser.run("admin", "Administrador Principal", "admin@fiergs.org.br", admin1Password, "admin");
    insertUser.run("gestor", "Gestor Geral", "gestor@fiergs.org.br", admin2Password, "admin");

    console.log("✅ Usuários administradores criados:");
    console.log("  - Administrador Principal (admin) - Função: admin");
    console.log("  - Gestor Geral (gestor) - Função: admin");

    console.log("\n📋 Credenciais de acesso:");
    console.log("Usuário 1:");
    console.log("  Username: admin");
    console.log("  Password: admin123");
    console.log("Usuário 2:");
    console.log("  Username: gestor");
    console.log("  Password: admin456");

    console.log("\n🎉 Banco de dados SQLite configurado com sucesso!");

  } catch (error) {
    console.error("❌ Erro ao configurar banco de dados:", error);
  } finally {
    db.close();
  }
}

initDatabase();