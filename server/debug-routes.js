
console.log('🔍 Verificando rota de atualização de objetivos...');
import { existsSync, readFileSync } from 'fs';

if (existsSync('routes.ts')) {
  const content = readFileSync('routes.ts', 'utf-8');
  const routeLines = content.split('\n');
  let inObjectiveUpdate = false;
  
  routeLines.forEach((line, index) => {
    if (line.includes('PUT') && line.includes('objectives')) {
      console.log(`Linha ${index + 1}: ${line}`);
      inObjectiveUpdate = true;
    } else if (inObjectiveUpdate && (line.includes('req.body') || line.includes('updateObjective'))) {
      console.log(`Linha ${index + 1}: ${line}`);
    } else if (inObjectiveUpdate && line.includes('}')) {
      inObjectiveUpdate = false;
    }
  });
} else {
  console.log('Arquivo routes.ts não encontrado');
}

