import { db } from "./mysql-db";
import { keyResults } from "@shared/mysql-schema-final";
import { eq } from "drizzle-orm";

// Força atualização do timestamp para invalidar caches frontend
async function invalidateCache() {
  console.log('🔄 Invalidando cache do frontend...');
  
  try {
    // Atualiza todos os Key Results forçando nova timestamp
    await db.update(keyResults).set({
      updatedAt: new Date(),
    });
    
    console.log('✅ Cache invalidado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao invalidar cache:', error);
    throw error;
  }
}

// Execute the cache invalidation
invalidateCache().then(() => {
  console.log('✅ Cache invalidation completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Cache invalidation failed:', error);
  process.exit(1);
});