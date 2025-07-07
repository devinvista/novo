
import { db } from "./db";

async function testConnection() {
  try {
    console.log("Testando conexão com o banco de dados...");
    
    // Tenta fazer uma query simples
    await db.execute("SELECT 1");
    
    console.log("✅ Conexão com banco de dados bem-sucedida!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao conectar com o banco de dados:", error);
    process.exit(1);
  }
}

testConnection();
