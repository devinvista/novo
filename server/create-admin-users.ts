import { db } from "./db";
import { users } from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function createAdminUsers() {
  try {
    console.log("Criando usuários administradores...");

    // Criar primeiro usuário admin
    const admin1Password = await hashPassword("admin123");
    const admin1 = {
      username: "admin",
      name: "Administrador Principal",
      email: "admin@fiergs.org.br",
      password: admin1Password,
      role: "admin" as const,
    };

    // Criar segundo usuário admin
    const admin2Password = await hashPassword("admin456");
    const admin2 = {
      username: "gestor",
      name: "Gestor Geral",
      email: "gestor@fiergs.org.br", 
      password: admin2Password,
      role: "admin" as const,
    };

    // Inserir usuários no banco
    const [createdAdmin1] = await db
      .insert(users)
      .values(admin1)
      .returning();

    const [createdAdmin2] = await db
      .insert(users)
      .values(admin2)
      .returning();

    console.log("✅ Usuários criados com sucesso:");
    console.log(`- ${createdAdmin1.name} (${createdAdmin1.username}) - ID: ${createdAdmin1.id}`);
    console.log(`- ${createdAdmin2.name} (${createdAdmin2.username}) - ID: ${createdAdmin2.id}`);
    
    console.log("\n📋 Credenciais de acesso:");
    console.log("Usuário 1:");
    console.log(`  Username: ${admin1.username}`);
    console.log(`  Password: admin123`);
    console.log("Usuário 2:");
    console.log(`  Username: ${admin2.username}`);
    console.log(`  Password: admin456`);

  } catch (error) {
    console.error("❌ Erro ao criar usuários:", error);
  }
}

createAdminUsers();