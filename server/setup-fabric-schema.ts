import { connectToFabric, executeQuery } from './fabric-storage';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function setupFabricSchema() {
  console.log('🔄 Setting up Microsoft Fabric SQL Server schema...');
  
  try {
    // Connect to SQL Fabric
    await connectToFabric();
    
    // Read and execute schema file
    const schemaPath = join(process.cwd(), 'server', 'fabric-schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    
    // Split schema into individual statements
    const statements = schema.split(/;\s*GO\s*|\s*;\s*(?=CREATE|DROP|INSERT|IF)/i)
      .filter(stmt => stmt.trim().length > 0);
    
    console.log(`📄 Executing ${statements.length} SQL statements...`);
    
    for (const statement of statements) {
      const trimmedStatement = statement.trim();
      if (trimmedStatement.length > 0) {
        try {
          await executeQuery(trimmedStatement);
          console.log(`✅ Executed: ${trimmedStatement.substring(0, 50)}...`);
        } catch (error) {
          console.error(`❌ Error executing statement: ${trimmedStatement.substring(0, 50)}...`);
          console.error(`   Error: ${error.message}`);
        }
      }
    }
    
    console.log('✅ Schema setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Failed to setup schema:', error.message);
    throw error;
  }
}

export async function seedFabricData() {
  console.log('🌱 Seeding Microsoft Fabric SQL Server with initial data...');
  
  try {
    // Connect to SQL Fabric
    await connectToFabric();
    
    // Seed Users
    console.log('👥 Seeding users...');
    await executeQuery(`
      INSERT INTO dbo.users (username, password, email, name, role) VALUES
      ('admin', '12cfad2ff4e4a96b7c7b72e4c6e4b9f21e6a8e90bf18b6a5e6d3f9b2c1a8e7d4', 'admin@fiergs.org.br', 'Administrador', 'admin'),
      ('tom', '12cfad2ff4e4a96b7c7b72e4c6e4b9f21e6a8e90bf18b6a5e6d3f9b2c1a8e7d4', 'tom@fiergs.org.br', 'Tom Silva', 'gestor'),
      ('maria', '12cfad2ff4e4a96b7c7b72e4c6e4b9f21e6a8e90bf18b6a5e6d3f9b2c1a8e7d4', 'maria@fiergs.org.br', 'Maria Santos', 'operacional'),
      ('carlos', '12cfad2ff4e4a96b7c7b72e4c6e4b9f21e6a8e90bf18b6a5e6d3f9b2c1a8e7d4', 'carlos@fiergs.org.br', 'Carlos Lima', 'operacional')
    `);
    
    // Seed Regions
    console.log('🗺️ Seeding regions...');
    await executeQuery(`
      INSERT INTO dbo.regions (name, code, description) VALUES
      ('Central', 'CEN', 'Região Central do Estado'),
      ('Metropolitana', 'MET', 'Região Metropolitana'),
      ('Norte', 'NOR', 'Região Norte'),
      ('Sul', 'SUL', 'Região Sul'),
      ('Leste', 'LES', 'Região Leste'),
      ('Oeste', 'OES', 'Região Oeste'),
      ('Nordeste', 'NE', 'Região Nordeste'),
      ('Noroeste', 'NO', 'Região Noroeste'),
      ('Sudeste', 'SE', 'Região Sudeste'),
      ('Sudoeste', 'SO', 'Região Sudoeste'),
      ('Centro-Oeste', 'CO', 'Região Centro-Oeste')
    `);
    
    // Seed Sub-regions
    console.log('🗺️ Seeding sub-regions...');
    await executeQuery(`
      INSERT INTO dbo.sub_regions (name, code, description, region_id) VALUES
      ('Porto Alegre', 'POA', 'Sub-região Porto Alegre', 2),
      ('Canoas', 'CAN', 'Sub-região Canoas', 2),
      ('Novo Hamburgo', 'NH', 'Sub-região Novo Hamburgo', 2),
      ('São Leopoldo', 'SL', 'Sub-região São Leopoldo', 2),
      ('Gravataí', 'GRA', 'Sub-região Gravataí', 2),
      ('Santa Maria', 'SM', 'Sub-região Santa Maria', 1),
      ('Passo Fundo', 'PF', 'Sub-região Passo Fundo', 3),
      ('Ijuí', 'IJU', 'Sub-região Ijuí', 6),
      ('Cruz Alta', 'CA', 'Sub-região Cruz Alta', 6),
      ('Pelotas', 'PEL', 'Sub-região Pelotas', 4),
      ('Rio Grande', 'RG', 'Sub-região Rio Grande', 4),
      ('Bagé', 'BAG', 'Sub-região Bagé', 4),
      ('Uruguaiana', 'URU', 'Sub-região Uruguaiana', 10),
      ('Santana do Livramento', 'SL', 'Sub-região Santana do Livramento', 10),
      ('Caxias do Sul', 'CS', 'Sub-região Caxias do Sul', 7),
      ('Bento Gonçalves', 'BG', 'Sub-região Bento Gonçalves', 7),
      ('Vacaria', 'VAC', 'Sub-região Vacaria', 7),
      ('Lajeado', 'LAJ', 'Sub-região Lajeado', 1),
      ('Estrela', 'EST', 'Sub-região Estrela', 1),
      ('Cachoeira do Sul', 'CS', 'Sub-região Cachoeira do Sul', 1),
      ('Santo Ângelo', 'SA', 'Sub-região Santo Ângelo', 8)
    `);
    
    // Seed Strategic Indicators
    console.log('📊 Seeding strategic indicators...');
    await executeQuery(`
      INSERT INTO dbo.strategic_indicators (name, description, category) VALUES
      ('Sustentabilidade Operacional', 'Indicador de sustentabilidade das operações', 'Operacional'),
      ('Receita de Serviços', 'Indicador de receita gerada pelos serviços', 'Financeiro'),
      ('Matrículas em Educação', 'Indicador de número de matrículas em educação', 'Educação'),
      ('Indústrias Atendidas em Saúde', 'Indicador de indústrias atendidas na área de saúde', 'Saúde'),
      ('Trabalhadores da Indústria Atendidos em Saúde', 'Indicador de trabalhadores atendidos na área de saúde', 'Saúde'),
      ('Matrículas Presenciais com Mais de 4 Horas', 'Indicador de matrículas presenciais com carga horária superior a 4 horas', 'Educação'),
      ('Custo Hora Aluno', 'Indicador de custo por hora de aluno', 'Financeiro')
    `);
    
    // Seed Solutions
    console.log('💡 Seeding solutions...');
    await executeQuery(`
      INSERT INTO dbo.solutions (name, description) VALUES
      ('Educação', 'Soluções relacionadas à educação e capacitação'),
      ('Saúde', 'Soluções relacionadas à saúde e segurança do trabalho')
    `);
    
    // Seed Service Lines
    console.log('🛠️ Seeding service lines...');
    await executeQuery(`
      INSERT INTO dbo.service_lines (name, description, solution_id) VALUES
      ('Educação Básica', 'Serviços de educação básica e fundamental', 1),
      ('Educação Profissional', 'Serviços de educação profissional e técnica', 1),
      ('Educação Superior', 'Serviços de educação superior e universitária', 1),
      ('Atividade Física', 'Serviços relacionados à atividade física e esporte', 2),
      ('Saúde Ocupacional', 'Serviços de saúde ocupacional e medicina do trabalho', 2),
      ('Segurança do Trabalho', 'Serviços de segurança e prevenção de acidentes', 2),
      ('Qualidade de Vida', 'Serviços de promoção da qualidade de vida', 2),
      ('Inovação e Tecnologia', 'Serviços de inovação e desenvolvimento tecnológico', 1),
      ('Consultoria Empresarial', 'Serviços de consultoria para empresas', 1),
      ('Meio Ambiente', 'Serviços relacionados ao meio ambiente e sustentabilidade', 2),
      ('Responsabilidade Social', 'Serviços de responsabilidade social empresarial', 2),
      ('Gestão e Governança', 'Serviços de gestão e governança corporativa', 1),
      ('Empreendedorismo', 'Serviços de apoio ao empreendedorismo', 1),
      ('Internacionalização', 'Serviços de apoio à internacionalização', 1),
      ('Pesquisa e Desenvolvimento', 'Serviços de pesquisa e desenvolvimento', 1)
    `);
    
    // Seed Services
    console.log('🔧 Seeding services...');
    await executeQuery(`
      INSERT INTO dbo.services (name, description, service_line_id) VALUES
      ('Ensino Fundamental', 'Serviços de ensino fundamental completo', 1),
      ('Ensino Médio', 'Serviços de ensino médio regular', 1),
      ('Curso Técnico', 'Cursos técnicos profissionalizantes', 2),
      ('Qualificação Profissional', 'Cursos de qualificação profissional', 2),
      ('Graduação', 'Cursos de graduação superior', 3),
      ('Pós-graduação', 'Cursos de pós-graduação e especialização', 3),
      ('Academia', 'Serviços de academia e condicionamento físico', 4),
      ('Esportes', 'Atividades esportivas e competições', 4),
      ('Medicina do Trabalho', 'Serviços médicos ocupacionais', 5),
      ('Exames Admissionais', 'Exames médicos admissionais', 5),
      ('Treinamento de Segurança', 'Treinamentos de segurança do trabalho', 6),
      ('Equipamentos de Proteção', 'Fornecimento de EPIs', 6),
      ('Alimentação Saudável', 'Serviços de alimentação e nutrição', 7),
      ('Bem-estar', 'Programas de bem-estar e qualidade de vida', 7),
      ('Laboratórios', 'Serviços de laboratório e análises', 8),
      ('Pesquisa Aplicada', 'Projetos de pesquisa aplicada', 8),
      ('Consultoria Técnica', 'Serviços de consultoria técnica especializada', 9),
      ('Diagnóstico Empresarial', 'Serviços de diagnóstico e avaliação empresarial', 9),
      ('Gestão Ambiental', 'Serviços de gestão e consultoria ambiental', 10),
      ('Sustentabilidade', 'Programas de sustentabilidade empresarial', 10),
      ('Projetos Sociais', 'Desenvolvimento de projetos sociais', 11),
      ('Voluntariado', 'Programas de voluntariado empresarial', 11),
      ('Governança Corporativa', 'Serviços de governança e compliance', 12),
      ('Gestão Estratégica', 'Consultoria em gestão estratégica', 12),
      ('Incubação', 'Serviços de incubação de empresas', 13),
      ('Aceleração', 'Programas de aceleração de startups', 13),
      ('Missões Comerciais', 'Organização de missões comerciais internacionais', 14),
      ('Certificação Internacional', 'Serviços de certificação para mercados internacionais', 14),
      ('P&D Industrial', 'Pesquisa e desenvolvimento industrial', 15),
      ('Inovação Tecnológica', 'Projetos de inovação tecnológica', 15)
    `);
    
    console.log('✅ Data seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Failed to seed data:', error.message);
    throw error;
  }
}

// Run setup if this file is executed directly
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (process.argv[1] === __filename) {
  (async () => {
    try {
      await setupFabricSchema();
      await seedFabricData();
      console.log('🎉 Microsoft Fabric SQL Server setup completed successfully!');
    } catch (error) {
      console.error('💥 Setup failed:', error.message);
      process.exit(1);
    }
  })();
}