import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertObjectiveSchema, insertKeyResultSchema, insertActionSchema, insertUserSchema } from "@shared/schema";
import { hashPassword } from "./auth";
import { z } from "zod";
import { formatDecimalBR, formatNumberBR, convertBRToDatabase, convertDatabaseToBR } from "./formatters";
import * as XLSX from "xlsx";
import multer from "multer";

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo inválido. Apenas arquivos Excel são permitidos.'), false);
    }
  }
});

// Authentication middleware
function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Autenticação necessária" });
  }
  next();
}

function requireRole(roles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Permissões insuficientes" });
    }
    next();
  };
}

export function registerRoutes(app: Express): Server {
  // Setup authentication routes
  setupAuth(app);

  // Remover o endpoint duplicado - usar apenas o do auth.ts

  // Reference data routes
  app.get("/api/solutions", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      let solutions = await storage.getSolutions();
      
      // Aplicar filtro de soluções para usuários não-admin
      if (user && user.role !== 'admin') {
        const userSolutionIds = Array.isArray(user.solutionIds) ? user.solutionIds : [];
        if (userSolutionIds.length > 0) {
          // Filtrar apenas as soluções que o usuário tem acesso
          solutions = solutions.filter(solution => userSolutionIds.includes(solution.id));
        }
      }
      
      res.json(solutions);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar soluções" });
    }
  });

  app.get("/api/regions", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      let regions = await storage.getRegions();
      
      if (user) {
        console.log(`Found ${regions.length} regions for user ${user.username} (role: ${user.role})`);
        
        // Aplicar filtro regional para usuários não-admin
        if (user.role !== 'admin') {
        const userRegionIds = Array.isArray(user.regionIds) ? user.regionIds : [];
        if (userRegionIds.length > 0) {
          // Filtrar apenas as regiões que o usuário tem acesso
          regions = regions.filter(region => userRegionIds.includes(region.id));
          console.log(`Filtered to ${regions.length} regions for non-admin user`);
        }
        }
      }
      
      res.json(regions);
    } catch (error) {
      console.error("Error fetching regions:", error);
      res.status(500).json({ message: "Erro ao buscar regiões" });
    }
  });

  app.get("/api/sub-regions", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      const regionId = req.query.regionId ? parseInt(req.query.regionId as string) : undefined;
      let subRegions = await storage.getSubRegions(regionId);
      
      // Aplicar filtro hierárquico para usuários não-admin
      if (user && user.role !== 'admin') {
        const userSubRegionIds = Array.isArray(user.subRegionIds) ? user.subRegionIds : [];
        const userRegionIds = Array.isArray(user.regionIds) ? user.regionIds : [];
        
        // Controle hierárquico: se tem sub-regiões específicas, mostrar apenas essas
        // Se tem apenas regiões, mostrar todas as sub-regiões dessas regiões
        if (userSubRegionIds.length > 0) {
          subRegions = subRegions.filter(subRegion => userSubRegionIds.includes(subRegion.id));
        } else if (userRegionIds.length > 0) {
          subRegions = subRegions.filter(subRegion => userRegionIds.includes(subRegion.regionId));
        }
      }
      
      res.json(subRegions);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar sub-regiões" });
    }
  });

  app.get("/api/service-lines", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      const solutionId = req.query.solutionId ? parseInt(req.query.solutionId as string) : undefined;
      let serviceLines = await storage.getServiceLines(solutionId);
      
      // Aplicar filtro hierárquico de linhas de serviço para usuários não-admin
      if (user && user.role !== 'admin') {
        const userServiceLineIds = Array.isArray(user.serviceLineIds) ? user.serviceLineIds : [];
        const userSolutionIds = Array.isArray(user.solutionIds) ? user.solutionIds : [];
        
        // Controle hierárquico: se tem linhas específicas, mostrar apenas essas
        // Se tem apenas soluções, mostrar todas as linhas dessas soluções
        if (userServiceLineIds.length > 0) {
          serviceLines = serviceLines.filter(serviceLine => userServiceLineIds.includes(serviceLine.id));
        } else if (userSolutionIds.length > 0) {
          serviceLines = serviceLines.filter(serviceLine => userSolutionIds.includes(serviceLine.solutionId));
        }
      }
      
      res.json(serviceLines);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar linhas de serviço" });
    }
  });

  app.get("/api/services", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      const serviceLineId = req.query.serviceLineId ? parseInt(req.query.serviceLineId as string) : undefined;
      let services = await storage.getServices(serviceLineId);
      
      // Aplicar filtro hierárquico de serviços para usuários não-admin
      if (user && user.role !== 'admin') {
        const userServiceIds = Array.isArray(user.serviceIds) ? user.serviceIds : [];
        const userServiceLineIds = Array.isArray(user.serviceLineIds) ? user.serviceLineIds : [];
        
        // Controle hierárquico: se tem serviços específicos, mostrar apenas esses
        // Se tem apenas linhas de serviço, mostrar todos os serviços dessas linhas
        if (userServiceIds.length > 0) {
          services = services.filter(service => userServiceIds.includes(service.id));
        } else if (userServiceLineIds.length > 0) {
          services = services.filter(service => userServiceLineIds.includes(service.serviceLineId));
        }
      }
      
      res.json(services);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar serviços" });
    }
  });

  app.get("/api/strategic-indicators", async (req, res) => {
    try {
      const indicators = await storage.getStrategicIndicators();
      res.json(indicators);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar indicadores estratégicos" });
    }
  });

  // Dashboard KPIs
  app.get("/api/dashboard/kpis", requireAuth, async (req: any, res) => {
    try {
      const currentUser = req.user;
      const filters: any = {
        regionId: req.query.regionId ? parseInt(req.query.regionId as string) : undefined,
        subRegionId: req.query.subRegionId ? parseInt(req.query.subRegionId as string) : undefined,
        quarter: req.query.quarter as string || undefined,
      };
      

      
      // Aplicar filtros de acesso baseados no usuário atual (multi-regional)
      if (currentUser.role !== 'admin') {
        const userRegionIds = currentUser.regionIds || [];
        const userSubRegionIds = currentUser.subRegionIds || [];
        
        // Se usuário tem regiões específicas e não foi especificado filtro, aplicar restrição
        if (userRegionIds.length > 0 && !filters.regionId) {
          filters.userRegionIds = userRegionIds;
        }
        if (userSubRegionIds.length > 0 && !filters.subRegionId) {
          filters.userSubRegionIds = userSubRegionIds;
        }
      }
      
      const kpis = await storage.getDashboardKPIs(currentUser.id, filters);
      res.json(kpis);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar KPIs do dashboard" });
    }
  });

  // Quarterly period endpoints
  app.get("/api/quarters", requireAuth, async (req: any, res) => {
    try {
      const quarters = await storage.getAvailableQuarters();
      res.json(quarters);
    } catch (error) {
      console.error("Error getting quarters:", error);
      res.status(500).json({ message: "Erro ao buscar períodos trimestrais" });
    }
  });

  app.get("/api/quarters/stats", requireAuth, async (req: any, res) => {
    try {
      const period = req.query.period as string || 'all';
      const stats = await storage.getQuarterlyStats();
      res.json(stats);
    } catch (error) {
      console.error("Error getting quarterly stats:", error);
      res.status(500).json({ message: "Erro ao buscar estatísticas trimestrais" });
    }
  });

  app.get("/api/quarters/:quarter/data", requireAuth, async (req: any, res) => {
    try {
      const { quarter } = req.params;
      const currentUser = req.user;
      
      const data = await storage.getQuarterlyData(quarter, currentUser.id);
      
      res.json(data);
    } catch (error) {
      console.error("Error getting quarterly data:", error);
      res.status(500).json({ message: "Erro ao buscar dados do período trimestral" });
    }
  });

  // Objectives routes
  app.get("/api/objectives", requireAuth, async (req: any, res) => {
    try {
      const filters = {
        regionId: req.query.regionId ? parseInt(req.query.regionId as string) : undefined,
        subRegionId: req.query.subRegionId ? parseInt(req.query.subRegionId as string) : undefined,
        serviceLineId: req.query.serviceLineId ? parseInt(req.query.serviceLineId as string) : undefined,
        ownerId: req.query.ownerId ? parseInt(req.query.ownerId as string) : undefined,
        currentUserId: req.user.id, // Adicionar controle de acesso
      };
      
      const objectives = await storage.getObjectives(filters);
      res.json(objectives);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar objetivos" });
    }
  });

  app.get("/api/objectives/:id", requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const objective = await storage.getObjective(id, req.user.id);
      
      if (!objective) {
        return res.status(404).json({ message: "Objetivo não encontrado ou sem acesso" });
      }
      
      res.json(objective);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar objetivo" });
    }
  });

  app.post("/api/objectives", requireAuth, requireRole(["admin", "gestor"]), async (req: any, res) => {
    try {
      const validation = insertObjectiveSchema.parse(req.body);
      
      // Verificar se o usuário pode criar objetivo na região/subregião especificada (multi-regional)
      const currentUser = req.user;
      if (currentUser.role !== 'admin') {
        const userRegionIds = currentUser.regionIds || [];
        const userSubRegionIds = currentUser.subRegionIds || [];
        
        if (validation.regionId && userRegionIds.length > 0 && !userRegionIds.includes(validation.regionId)) {
          return res.status(403).json({ message: "Sem permissão para criar objetivo nesta região" });
        }
        if (validation.subRegionId && userSubRegionIds.length > 0 && !userSubRegionIds.includes(validation.subRegionId)) {
          return res.status(403).json({ message: "Sem permissão para criar objetivo nesta subregião" });
        }
      }
      
      const objective = await storage.createObjective(validation);
      res.status(201).json(objective);
    } catch (error) {
      console.error('Error creating objective:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao criar objetivo", details: error instanceof Error ? error.message : 'Erro desconhecido' });
    }
  });

  app.put("/api/objectives/:id", requireAuth, requireRole(["admin", "gestor"]), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`🔍 Atualizando objetivo ${id} - Dados recebidos:`, JSON.stringify(req.body, null, 2));
      
      const validation = insertObjectiveSchema.partial().parse(req.body);
      console.log(`✅ Dados validados:`, JSON.stringify(validation, null, 2));
      
      // Verificar se subRegionIds foi enviado e migrar para sub_region_ids
      if (validation.subRegionIds && Array.isArray(validation.subRegionIds) && validation.subRegionIds.length > 0) {
        console.log(`🔄 Migrando subRegionIds para sub_region_ids:`, validation.subRegionIds);
        validation.subRegionIds = validation.subRegionIds;
      }
      
      const existingObjective = await storage.getObjective(id, req.user.id);
      if (!existingObjective) {
        return res.status(404).json({ message: "Objetivo não encontrado ou sem acesso" });
      }
      
      const objective = await storage.updateObjective(id, validation);
      console.log(`💾 Objetivo atualizado:`, JSON.stringify(objective, null, 2));
      res.json(objective);
    } catch (error) {
      console.error(`❌ Erro ao atualizar objetivo ${id}:`, error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao atualizar objetivo" });
    }
  });

  app.delete("/api/objectives/:id", requireAuth, requireRole(["admin", "gestor"]), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const existingObjective = await storage.getObjective(id, req.user.id);
      if (!existingObjective) {
        return res.status(404).json({ message: "Objetivo não encontrado ou sem acesso" });
      }
      
      await storage.deleteObjective(id);
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Erro ao excluir objetivo" });
    }
  });

  // Key Results routes
  app.get("/api/key-results", requireAuth, async (req: any, res) => {
    try {
      const objectiveId = req.query.objectiveId ? parseInt(req.query.objectiveId as string) : undefined;
      console.log("Fetching key results for objectiveId:", objectiveId);
      const keyResults = await storage.getKeyResults(objectiveId);
      console.log("Key results found:", keyResults.length);
      
      // CONVERSÃO PADRÃO BRASILEIRO: Converter valores do banco para formato brasileiro
      // Usar formatação inteligente (sem decimais desnecessários)
      const keyResultsBR = keyResults.map(kr => ({
        ...kr,
        currentValue: convertDatabaseToBR(kr.currentValue || "0"),
        targetValue: convertDatabaseToBR(kr.targetValue || "0"),
        progress: kr.progress !== null && kr.progress !== undefined ? parseFloat(kr.progress.toString()) : 0
      }));
      
      // Debug the specific Key Result Teste
      const testKR = keyResultsBR.find(kr => kr.title === 'Key Result Teste');
      if (testKR) {
        console.log('🔍 API Response - Key Result Teste (Formato BR):', {
          progress: testKR.progress,
          progressType: typeof testKR.progress,
          currentValue: testKR.currentValue,
          targetValue: testKR.targetValue
        });
      }
      
      // Disable cache to force fresh data
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.json(keyResultsBR);
    } catch (error) {
      console.error("Error in /api/key-results:", error);
      res.status(500).json({ message: "Erro ao buscar resultados-chave", error: (error as Error).message });
    }
  });

  app.post("/api/key-results", requireAuth, requireRole(["admin", "gestor"]), async (req: any, res) => {
    try {
      // Transform strategicIndicatorId to strategicIndicatorIds if needed
      const requestData = { ...req.body };
      if (requestData.strategicIndicatorId && !requestData.strategicIndicatorIds) {
        requestData.strategicIndicatorIds = [requestData.strategicIndicatorId];
      }
      
      // Handle unit field - convert null to empty string
      if (requestData.unit === null) {
        requestData.unit = "";
      }
      
      // CONVERSÃO PADRÃO BRASILEIRO: Converter valores do formato brasileiro para banco
      if (requestData.targetValue) {
        const targetValueDb = convertBRToDatabase(requestData.targetValue);
        requestData.targetValue = targetValueDb.toString();
      }
      
      if (requestData.currentValue) {
        const currentValueDb = convertBRToDatabase(requestData.currentValue);
        requestData.currentValue = currentValueDb.toString();
      }
      
      const validation = insertKeyResultSchema.parse(requestData);
      
      // Verificar se o usuário tem acesso ao objetivo
      const objective = await storage.getObjective(validation.objectiveId, req.user.id);
      if (!objective) {
        return res.status(403).json({ message: "Sem permissão para criar resultado-chave neste objetivo" });
      }
      
      // Calculate initial status based on dates
      const startDate = new Date(validation.startDate);
      const endDate = new Date(validation.endDate);
      const today = new Date();
      
      let status = validation.status || 'active';
      if (today < startDate) {
        status = 'pending';
      } else if (today > endDate && 0 < parseFloat(validation.targetValue.toString())) {
        status = 'delayed';
      }
      
      console.log('Validation data:', validation);
      console.log('Processing key result with status:', status);
      
      const keyResult = await storage.createKeyResult({
        ...validation,
        targetValue: validation.targetValue?.toString() || "0",
        // initialValue removed - not in MySQL schema
        startDate: validation.startDate,
        endDate: validation.endDate,
        status,
      });
      
      res.status(201).json(keyResult);
    } catch (error) {
      console.error('Error in key-results creation:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao criar resultado-chave", error: (error as Error).message });
    }
  });

  app.put("/api/key-results/:id", requireAuth, requireRole(["admin", "gestor"]), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Transform and validate data like in creation route
      const requestData = { ...req.body };
      if (requestData.strategicIndicatorId && !requestData.strategicIndicatorIds) {
        requestData.strategicIndicatorIds = [requestData.strategicIndicatorId];
      }
      
      // Handle unit field - convert null to empty string
      if (requestData.unit === null) {
        requestData.unit = "";
      }
      
      // CONVERSÃO PADRÃO BRASILEIRO: Converter valores do formato brasileiro para banco
      if (requestData.targetValue) {
        const targetValueDb = convertBRToDatabase(requestData.targetValue);
        requestData.targetValue = targetValueDb.toString();
      }
      
      if (requestData.currentValue) {
        const currentValueDb = convertBRToDatabase(requestData.currentValue);
        requestData.currentValue = currentValueDb.toString();
      }
      
      const validation = insertKeyResultSchema.partial().parse(requestData);
      
      const existingKeyResult = await storage.getKeyResult(id, req.user.id);
      if (!existingKeyResult) {
        return res.status(404).json({ message: "Resultado-chave não encontrado ou sem acesso" });
      }
      
      // Se objectiveId está sendo alterado, verificar permissão no novo objetivo
      if (validation.objectiveId && validation.objectiveId !== existingKeyResult.objectiveId) {
        const newObjective = await storage.getObjective(validation.objectiveId, req.user.id);
        if (!newObjective) {
          return res.status(403).json({ message: "Sem permissão para mover resultado-chave para este objetivo" });
        }
      }
      
      const updateData = { ...validation };
      if (updateData.targetValue !== undefined) {
        updateData.targetValue = updateData.targetValue.toString();
      }
      
      const keyResult = await storage.updateKeyResult(id, updateData);
      
      res.json(keyResult);
    } catch (error) {
      console.error('Error updating key result:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao atualizar resultado-chave" });
    }
  });

  app.delete("/api/key-results/:id", requireAuth, requireRole(["admin", "gestor"]), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const existingKeyResult = await storage.getKeyResult(id, req.user.id);
      if (!existingKeyResult) {
        return res.status(404).json({ message: "Resultado-chave não encontrado ou sem acesso" });
      }
      
      await storage.deleteKeyResult(id);
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Erro ao excluir resultado-chave" });
    }
  });

  // Actions routes with hierarchical access control
  app.get("/api/actions", requireAuth, async (req: any, res) => {
    try {
      const keyResultId = req.query.keyResultId ? parseInt(req.query.keyResultId as string) : undefined;
      // Include currentUserId for hierarchical access control
      const actions = await storage.getActions(keyResultId);
      res.json(actions);
    } catch (error) {
      console.error("Error fetching actions:", error);
      res.status(500).json({ message: "Erro ao buscar ações" });
    }
  });

  app.post("/api/actions", requireAuth, async (req: any, res) => {
    console.log("Action creation request:", {
      authenticated: req.isAuthenticated(),
      userId: req.user?.id,
      body: req.body
    });
    
    try {
      // Clean up null values
      const requestData = { ...req.body };
      if (requestData.responsibleId === null) requestData.responsibleId = undefined;
      if (requestData.dueDate === null || requestData.dueDate === "") requestData.dueDate = undefined;
      
      const validation = insertActionSchema.parse(requestData);
      console.log("Validated action data:", validation);
      
      // Verificar se o usuário tem acesso ao key result
      const keyResult = await storage.getKeyResult(validation.keyResultId, req.user.id);
      if (!keyResult) {
        return res.status(403).json({ message: "Sem permissão para criar ação neste resultado-chave" });
      }
      
      const action = await storage.createAction(validation);
      console.log("Created action:", action);
      
      res.status(201).json(action);
    } catch (error) {
      console.error("Error creating action:", error);
      if (error instanceof z.ZodError) {
        console.log("Validation errors:", error.errors);
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao criar ação" });
    }
  });

  // Update action
  app.put("/api/actions/:id", requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check access to action
      const existingAction = await storage.getAction(id, req.user.id);
      if (!existingAction) {
        return res.status(404).json({ message: "Ação não encontrada ou sem acesso" });
      }
      
      // Clean up null values and validate
      const requestData = { ...req.body };
      if (requestData.responsibleId === null) requestData.responsibleId = undefined;
      if (requestData.dueDate === null || requestData.dueDate === "") requestData.dueDate = undefined;
      
      const validation = insertActionSchema.partial().parse(requestData);
      console.log("Updating action with data:", validation);
      
      const updatedAction = await storage.updateAction(id, validation);
      console.log("Updated action:", updatedAction);
      
      res.json(updatedAction);
    } catch (error) {
      console.error("Error updating action:", error);
      if (error instanceof z.ZodError) {
        console.log("Validation errors:", error.errors);
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao atualizar ação" });
    }
  });

  // Delete action
  app.delete("/api/actions/:id", requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check access to action
      const existingAction = await storage.getAction(id, req.user.id);
      if (!existingAction) {
        return res.status(404).json({ message: "Ação não encontrada ou sem acesso" });
      }
      
      await storage.deleteAction(id);
      res.sendStatus(204);
    } catch (error) {
      console.error("Error deleting action:", error);
      res.status(500).json({ message: "Erro ao excluir ação" });
    }
  });

  // Get action comments
  app.get('/api/actions/:actionId/comments', requireAuth, async (req, res) => {
    try {
      const actionId = parseInt(req.params.actionId);
      
      // Check access to action
      const action = await storage.getAction(actionId, req.user?.id);
      if (!action) {
        return res.status(404).json({ message: "Ação não encontrada ou sem acesso" });
      }

      const comments = await storage.getActionComments(actionId);
      res.json(comments);
    } catch (error) {
      console.error('Error fetching action comments:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Create action comment
  app.post('/api/actions/:actionId/comments', requireAuth, async (req, res) => {
    try {
      const actionId = parseInt(req.params.actionId);
      
      // Check access to action
      const action = await storage.getAction(actionId, req.user?.id);
      if (!action) {
        return res.status(404).json({ message: "Ação não encontrada ou sem acesso" });
      }

      const commentData = {
        actionId,
        userId: req.user!.id,
        comment: req.body.comment
      };

      const newComment = await storage.createActionComment(commentData);
      
      // Return comment with user info
      const commentWithUser = await storage.getActionComments(actionId);
      const addedComment = commentWithUser.find(c => c.id === newComment.id);
      
      res.status(201).json(addedComment);
    } catch (error) {
      console.error('Error creating action comment:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Checkpoints routes with hierarchical access control
  app.get("/api/checkpoints", requireAuth, async (req: any, res) => {
    try {
      const keyResultId = req.query.keyResultId ? parseInt(req.query.keyResultId as string) : undefined;
      console.log(`Fetching checkpoints for keyResultId: ${keyResultId}`);
      // Use currentUserId for hierarchical access control
      const checkpoints = await storage.getCheckpoints(keyResultId, req.user.id);
      console.log(`Found ${checkpoints.length} checkpoints`);
      
      // CONVERSÃO PADRÃO BRASILEIRO: Converter valores para formato brasileiro
      // Usar formatação inteligente (sem decimais desnecessários)
      const checkpointsBR = checkpoints.map(checkpoint => ({
        ...checkpoint,
        actualValue: checkpoint.actualValue ? convertDatabaseToBR(checkpoint.actualValue) : null,
        targetValue: convertDatabaseToBR(checkpoint.targetValue || "0"),
        progress: checkpoint.progress ? convertDatabaseToBR(checkpoint.progress) : "0"
      }));
      
      res.json(checkpointsBR);
    } catch (error) {
      console.error("Error fetching checkpoints:", error);
      res.status(500).json({ message: "Erro ao buscar checkpoints" });
    }
  });

  app.post("/api/checkpoints/:id/update", requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { actualValue, status } = req.body;
      
      // Verificar acesso ao checkpoint
      const existingCheckpoint = await storage.getCheckpoint(id, req.user.id);
      if (!existingCheckpoint) {
        return res.status(404).json({ message: "Checkpoint não encontrado ou sem acesso" });
      }
      
      // CONVERSÃO PADRÃO BRASILEIRO: Converter valor real do formato brasileiro para banco
      const actualValueDb = actualValue ? convertBRToDatabase(actualValue) : 0;
      
      const updated = await storage.updateCheckpoint(id, {
        actualValue: actualValueDb.toString(),
        status: status || "pending",
      });
      
      // CONVERSÃO PADRÃO BRASILEIRO: Converter resposta para formato brasileiro
      const updatedBR = {
        ...updated,
        actualValue: convertDatabaseToBR(updated.actualValue || "0", 2),
        targetValue: convertDatabaseToBR(updated.targetValue || "0", 2),
        progress: updated.progress ? convertDatabaseToBR(updated.progress, 2) : "0,00"
      };
      
      res.json(updatedBR);
    } catch (error) {
      console.error("Error updating checkpoint:", error);
      res.status(500).json({ message: "Erro ao atualizar checkpoint" });
    }
  });

  app.post("/api/key-results/:id/recreate-checkpoints", requireAuth, async (req: any, res) => {
    try {
      const keyResultId = parseInt(req.params.id);
      
      // Verificar acesso ao key result
      const keyResult = await storage.getKeyResult(keyResultId, req.user.id);
      if (!keyResult) {
        return res.status(404).json({ message: "Resultado-chave não encontrado ou sem acesso" });
      }
      
      const checkpoints = await storage.generateCheckpoints(keyResultId);
      res.json(checkpoints);
    } catch (error) {
      console.error("Error recreating checkpoints:", error);
      res.status(500).json({ message: "Erro ao recriar checkpoints" });
    }
  });

  // GET single checkpoint
  app.get("/api/checkpoints/:id", requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`🔍 GET /api/checkpoints/${id} called by user ${req.user.id}`);
      
      const checkpoint = await storage.getCheckpoint(id, req.user.id);
      if (!checkpoint) {
        console.log(`❌ Checkpoint ${id} not found for user ${req.user.id}`);
        return res.status(404).json({ message: "Checkpoint não encontrado ou sem acesso" });
      }
      
      console.log(`✅ Found checkpoint ${id} for keyResultId: ${checkpoint.keyResultId}`);
      res.json(checkpoint);
    } catch (error) {
      console.error(`Error fetching checkpoint ${req.params.id}:`, error);
      res.status(500).json({ message: "Erro ao buscar checkpoint" });
    }
  });

  app.put("/api/checkpoints/:id", requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { actualValue, notes, status, completedDate, completedAt } = req.body;
      
      console.log(`🚀 PUT /api/checkpoints/${id} called with:`, { actualValue, notes, status, completedDate, completedAt });
      
      const existingCheckpoint = await storage.getCheckpoint(id, req.user.id);
      if (!existingCheckpoint) {
        console.log(`❌ Checkpoint ${id} not found for user ${req.user.id}`);
        return res.status(404).json({ message: "Checkpoint não encontrado ou sem acesso" });
      }
      
      console.log(`✅ Found checkpoint ${id} for keyResultId: ${existingCheckpoint.keyResultId}`);
      
      // Calculate progress
      const targetValue = parseFloat(existingCheckpoint.targetValue);
      const actual = parseFloat(actualValue.replace(',', '.'));
      const progress = targetValue > 0 ? (actual / targetValue) * 100 : 0;
      
      // Update checkpoint
      const checkpoint = await storage.updateCheckpoint(id, {
        actualValue: actualValue.toString(),
        notes,
        status: status || 'completed',
        completedDate: completedDate || (status === 'completed' ? new Date().toISOString() : null),
        completedAt: completedAt || (status === 'completed' ? new Date().toISOString() : null),
        progress: progress.toString()
      });
      
      // Update Key Result currentValue with the latest completed checkpoint value
      if (status === 'completed' || !status) {
        try {
          console.log(`🔄 Updating Key Result currentValue for keyResultId: ${existingCheckpoint.keyResultId}`);
          
          // Get all checkpoints for this key result
          const allCheckpoints = await storage.getCheckpoints(
            existingCheckpoint.keyResultId,
            req.user.id 
          );
          
          console.log(`📊 Found ${allCheckpoints.length} total checkpoints for KR ${existingCheckpoint.keyResultId}`);
          
          // Filter only completed checkpoints and sort by due date (most recent first)
          const completedCheckpoints = allCheckpoints
            .filter((cp: any) => {
              // The checkpoint data is directly in cp, not nested
              const isCompleted = cp.status === 'completed';
              const actualValue = cp.actualValue;
              const numValue = actualValue ? parseFloat(actualValue) : 0;
              
              console.log(`🔍 Checkpoint ${cp.id}: status=${cp.status}, actualValue=${actualValue}, numValue=${numValue}`);
              
              return isCompleted && actualValue && numValue > 0;
            })
            .sort((a: any, b: any) => {
              const dateA = new Date(a.dueDate).getTime();
              const dateB = new Date(b.dueDate).getTime();
              return dateB - dateA; // Most recent first
            });
          
          console.log(`✅ Found ${completedCheckpoints.length} completed checkpoints with values`);
          
          // Update Key Result with the most recent completed checkpoint value
          if (completedCheckpoints.length > 0) {
            const latestCheckpoint = completedCheckpoints[0];
            const latestValue = latestCheckpoint.actualValue;
            
            console.log(`🎯 Updating KR ${existingCheckpoint.keyResultId} currentValue to: ${latestValue}`);
            
            await storage.updateKeyResult(existingCheckpoint.keyResultId, {
              currentValue: latestValue.toString()
            });
            
            console.log(`✅ Successfully updated Key Result ${existingCheckpoint.keyResultId} currentValue to ${latestValue}`);
          } else {
            console.log(`⚠️ No completed checkpoints with values found for KR ${existingCheckpoint.keyResultId}`);
          }
        } catch (updateError) {
          console.error('❌ Error updating Key Result currentValue:', updateError);
          // Don't fail the checkpoint update if KR update fails
        }
      }
      
      res.json(checkpoint);
    } catch (error) {
      console.error("Error updating checkpoint:", error);
      res.status(500).json({ message: "Erro ao atualizar checkpoint" });
    }
  });

  // Delete checkpoint
  app.delete("/api/checkpoints/:id", requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const existingCheckpoint = await storage.getCheckpoint(id, req.user.id);
      if (!existingCheckpoint) {
        return res.status(404).json({ message: "Checkpoint não encontrado ou sem acesso" });
      }
      
      await storage.deleteCheckpoint(id);
      res.sendStatus(204);
    } catch (error) {
      console.error("Error deleting checkpoint:", error);
      res.status(500).json({ message: "Erro ao excluir checkpoint" });
    }
  });

  // Executive Summary API
  app.get("/api/executive-summary", requireAuth, async (req: any, res) => {
    try {
      const currentUserId = req.user?.id;
      const currentUserRole = req.user?.role;
      
      // Get all objectives, key results, actions, and checkpoints with real data
      const objectives = await storage.getObjectives(currentUserId ? { currentUserId } : {});
      const keyResults = await storage.getKeyResults(currentUserId ? { currentUserId } : {});
      const actions = await storage.getActions(currentUserId ? { currentUserId } : {});
      const checkpoints = await storage.getCheckpoints(currentUserId ? { currentUserId } : {});
      
      // Calculate overall metrics
      const totalObjectives = objectives.length;
      const totalKeyResults = keyResults.length;
      const totalActions = actions.length;
      const totalCheckpoints = checkpoints.length;
      
      // Calculate progress metrics
      const completedObjectives = objectives.filter(obj => obj.status === 'completed').length;
      const completedKeyResults = keyResults.filter(kr => kr.progress >= 100).length;
      const completedActions = actions.filter(action => action.status === 'completed').length;
      const completedCheckpoints = checkpoints.filter(cp => cp.status === 'completed').length;
      
      // Calculate completion rates
      const objectiveCompletionRate = totalObjectives > 0 ? (completedObjectives / totalObjectives) * 100 : 0;
      const keyResultCompletionRate = totalKeyResults > 0 ? (completedKeyResults / totalKeyResults) * 100 : 0;
      const actionCompletionRate = totalActions > 0 ? (completedActions / totalActions) * 100 : 0;
      const checkpointCompletionRate = totalCheckpoints > 0 ? (completedCheckpoints / totalCheckpoints) * 100 : 0;
      
      // Calculate average progress for key results
      const avgKeyResultProgress = keyResults.length > 0 
        ? keyResults.reduce((sum, kr) => sum + (kr.progress || 0), 0) / keyResults.length 
        : 0;
      
      // Group objectives by region
      const objectivesByRegion = objectives.reduce((acc, obj) => {
        acc[obj.regionId] = (acc[obj.regionId] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);
      
      // Get top performing key results
      const topKeyResults = keyResults
        .sort((a, b) => (b.progress || 0) - (a.progress || 0))
        .slice(0, 5)
        .map(kr => ({
          title: kr.title,
          progress: kr.progress || 0,
          currentValue: kr.currentValue ? convertDatabaseToBR(kr.currentValue) : '0',
          targetValue: kr.targetValue ? convertDatabaseToBR(kr.targetValue) : '0'
        }));
      
      // Calculate strategic indicators performance
      const strategicIndicators = await storage.getStrategicIndicators();
      
      // Get overdue items
      const currentDate = new Date();
      const overdueObjectives = objectives.filter(obj => 
        new Date(obj.endDate) < currentDate && obj.status !== 'completed'
      ).length;
      
      const overdueActions = actions.filter(action => 
        action.dueDate && new Date(action.dueDate) < currentDate && action.status !== 'completed'
      ).length;
      
      // Main strategic objectives (top 3 by importance/scope)
      const mainObjectives = objectives
        .sort((a, b) => (b.keyResults?.length || 0) - (a.keyResults?.length || 0))
        .slice(0, 3)
        .map(obj => ({
          title: obj.title,
          description: obj.description,
          status: obj.status,
          progress: obj.keyResults ? 
            obj.keyResults.reduce((sum: number, kr: any) => sum + (kr.progress || 0), 0) / obj.keyResults.length : 0,
          keyResultsCount: obj.keyResults?.length || 0,
          actionsCount: obj.actions?.length || 0
        }));
      
      const executiveSummary = {
        overview: {
          totalObjectives,
          totalKeyResults,
          totalActions,
          totalCheckpoints,
          objectiveCompletionRate: Math.round(objectiveCompletionRate),
          keyResultCompletionRate: Math.round(keyResultCompletionRate),
          actionCompletionRate: Math.round(actionCompletionRate),
          checkpointCompletionRate: Math.round(checkpointCompletionRate),
          avgKeyResultProgress: Math.round(avgKeyResultProgress)
        },
        mainObjectives,
        topKeyResults,
        performance: {
          objectivesOnTrack: objectives.filter(obj => obj.status === 'active').length,
          objectivesAtRisk: overdueObjectives,
          actionsOverdue: overdueActions,
          strategicIndicatorsCount: strategicIndicators.length
        },
        distribution: {
          objectivesByRegion,
          activeQuarter: "2025-T3"
        },
        trends: {
          objectivesCreatedThisQuarter: objectives.filter(obj => {
            const createdDate = new Date(obj.createdAt);
            const quarterStart = new Date(new Date().getFullYear(), Math.floor(new Date().getMonth() / 3) * 3, 1);
            return createdDate >= quarterStart;
          }).length,
          keyResultsWithHighProgress: keyResults.filter(kr => (kr.progress || 0) >= 75).length,
          completedActionsThisQuarter: actions.filter(action => {
            if (action.status !== 'completed' || !action.updatedAt) return false;
            const updatedDate = new Date(action.updatedAt);
            const quarterStart = new Date(new Date().getFullYear(), Math.floor(new Date().getMonth() / 3) * 3, 1);
            return updatedDate >= quarterStart;
          }).length
        }
      };
      
      res.json(executiveSummary);
    } catch (error) {
      console.error("Error generating executive summary:", error);
      res.status(500).json({ message: "Erro ao gerar resumo executivo" });
    }
  });

  // TODO: Implement activities feature if needed

  // User management routes with hierarchical access control
  app.get("/api/users", requireAuth, async (req: any, res) => {
    try {
      const currentUserId = req.user?.id;
      const currentUserRole = req.user?.role;
      
      // Implementar controle de acesso por time
      let users = await storage.getUsers();
      
      if (currentUserRole === 'admin') {
        // Admin pode ver todos os usuários
        // Não aplica filtro
      } else if (currentUserRole === 'gestor') {
        // Gestor pode ver apenas a si próprio e usuários operacionais de seu time
        users = users.filter(user => 
          user.id === currentUserId || 
          (user.role === 'operacional' && user.gestorId === currentUserId)
        );
      } else {
        // Operacional pode ver apenas a si próprio
        users = users.filter(user => user.id === currentUserId);
      }
      
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Erro ao buscar usuários" });
    }
  });

  app.get("/api/managers", async (req, res) => {
    try {
      const managers = await storage.getManagers();
      res.json(managers);
    } catch (error) {
      console.error("Error fetching managers:", error);
      res.status(500).json({ message: "Erro ao buscar gestores" });
    }
  });

  app.get("/api/pending-users", requireAuth, requireRole(["admin", "gestor"]), async (req: any, res) => {
    try {
      const currentUserId = req.user?.id;
      const pendingUsers = await storage.getPendingUsers();
      res.json(pendingUsers);
    } catch (error) {
      console.error("Error fetching pending users:", error);
      res.status(500).json({ message: "Erro ao buscar usuários pendentes" });
    }
  });

  app.post("/api/users", requireAuth, requireRole(["admin", "gestor"]), async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Gestores só podem criar usuários operacionais
      if (req.user?.role === "gestor" && userData.role !== "operacional") {
        return res.status(403).json({ message: "Gestores só podem criar usuários operacionais" });
      }

      // Hash password
      userData.password = await hashPassword(userData.password as string);

      // Users created by admins/gestores are auto-approved
      (userData as any).approved = true;

      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Erro ao criar usuário" });
    }
  });

  app.patch("/api/users/:id", requireAuth, requireRole(["admin", "gestor"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userData = req.body;
      
      console.log(`Updating user ${id} with data:`, userData);

      // Verificar se o usuário pode editar este usuário
      const targetUser = await storage.getUser(id);
      if (!targetUser) {
        console.log(`User ${id} not found`);
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Gestores só podem editar usuários operacionais
      if (req.user?.role === "gestor" && targetUser.role !== "operacional") {
        console.log(`User ${req.user.id} (${req.user.role}) trying to edit user ${id} (${targetUser.role})`);
        return res.status(403).json({ message: "Sem permissão para editar este usuário" });
      }

      // Hash password se fornecida
      if (userData.password && userData.password.trim() !== "") {
        console.log("Hashing new password");
        userData.password = await hashPassword(userData.password);
      } else {
        console.log("No password provided, removing from update data");
        delete userData.password; // Não atualizar senha se não fornecida
      }

      console.log("Final update data:", { ...userData, password: userData.password ? "[HIDDEN]" : undefined });
      const user = await storage.updateUser(id, userData);
      console.log("User updated successfully");
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Erro ao atualizar usuário", error: error instanceof Error ? error.message : 'Erro desconhecido' });
    }
  });

  app.delete("/api/users/:id", requireAuth, requireRole(["admin", "gestor"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Não permitir deletar a si mesmo
      if (id === req.user?.id) {
        return res.status(400).json({ message: "Não é possível excluir seu próprio usuário" });
      }

      // Verificar se o usuário pode deletar este usuário
      const targetUser = await storage.getUser(id);
      if (!targetUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Gestores só podem deletar usuários operacionais
      if (req.user?.role === "gestor" && targetUser.role !== "operacional") {
        return res.status(403).json({ message: "Sem permissão para excluir este usuário" });
      }

      await storage.deleteUser(id);
      res.json({ message: "Usuário excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Erro ao excluir usuário" });
    }
  });

  app.patch("/api/users/:id/status", requireAuth, requireRole(["admin", "gestor"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { active } = req.body;

      // Verificar se o usuário pode alterar o status deste usuário
      const targetUser = await storage.getUser(id);
      if (!targetUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Gestores só podem alterar status de usuários operacionais
      if (req.user?.role === "gestor" && targetUser.role !== "operacional") {
        return res.status(403).json({ message: "Sem permissão para alterar status deste usuário" });
      }

      const user = await storage.updateUser(id, { active });
      res.json(user);
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Erro ao alterar status do usuário" });
    }
  });

  app.post("/api/users/approve", requireAuth, requireRole(["admin", "gestor"]), async (req, res) => {
    try {
      const { 
        id,
        regionIds,
        subRegionIds,
        solutionIds,
        serviceLineIds,
        serviceIds
      } = req.body; // ID do usuário + Permissões específicas que o gestor pode definir

      console.log(`Approving user ${id} by ${req.user?.id}`);

      // Verificar se o usuário pode aprovar este usuário
      const targetUser = await storage.getUser(id);
      if (!targetUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Verificar hierarquia de aprovação
      if (req.user?.role === "gestor") {
        // Gestores só podem aprovar usuários operacionais
        if (targetUser.role !== "operacional") {
          return res.status(403).json({ message: "Gestores só podem aprovar usuários operacionais" });
        }
        
        // Gestores só podem aprovar usuários vinculados a eles
        if (targetUser.gestorId !== req.user.id) {
          return res.status(403).json({ message: "Só é possível aprovar usuários vinculados a você" });
        }
      }

      // Obter gestor para herança de permissões
      const gestor = targetUser.gestorId ? await storage.getUserById(targetUser.gestorId) : null;
      
      // Configurar permissões herdadas ou limitadas
      let finalPermissions = {
        regionIds: regionIds || [],
        subRegionIds: subRegionIds || [],
        solutionIds: solutionIds || [],
        serviceLineIds: serviceLineIds || [],
        serviceIds: serviceIds || []
      };

      // Herdar permissões do gestor se não foram especificadas
      if (gestor) {
        finalPermissions.regionIds = finalPermissions.regionIds.length > 0 
          ? finalPermissions.regionIds.filter((id: number) => (gestor.regionIds as number[] || []).includes(id))
          : gestor.regionIds as number[] || [];
        
        finalPermissions.subRegionIds = finalPermissions.subRegionIds.length > 0 
          ? finalPermissions.subRegionIds.filter((id: number) => (gestor.subRegionIds as number[] || []).includes(id))
          : gestor.subRegionIds as number[] || [];
          
        finalPermissions.solutionIds = finalPermissions.solutionIds.length > 0 
          ? finalPermissions.solutionIds.filter((id: number) => (gestor.solutionIds as number[] || []).includes(id))
          : gestor.solutionIds as number[] || [];
          
        finalPermissions.serviceLineIds = finalPermissions.serviceLineIds.length > 0 
          ? finalPermissions.serviceLineIds.filter((id: number) => (gestor.serviceLineIds as number[] || []).includes(id))
          : gestor.serviceLineIds as number[] || [];
          
        finalPermissions.serviceIds = finalPermissions.serviceIds.length > 0 
          ? finalPermissions.serviceIds.filter((id: number) => (gestor.serviceIds as number[] || []).includes(id))
          : gestor.serviceIds as number[] || [];
      }

      // Aprovar usuário com permissões herdadas/configuradas
      const user = await storage.approveUserWithPermissions(id, req.user!.id, finalPermissions);
      console.log("User approved successfully with inherited permissions", finalPermissions);
      res.json(user);
    } catch (error) {
      console.error("Error approving user:", error);
      res.status(500).json({ message: "Erro ao aprovar usuário", error: error instanceof Error ? error.message : 'Erro desconhecido' });
    }
  });

  // TEST ENDPOINT - for debugging KR progress calculation
  app.post("/api/test-kr-progress/:keyResultId", requireAuth, async (req, res) => {
    try {
      const keyResultId = parseInt(req.params.keyResultId);
      console.log(`Testing KR progress calculation for KR ${keyResultId}`);
      
      // Force update progress calculation
      await (storage as any).updateKeyResultProgressFromCheckpoints(keyResultId);
      
      // Get updated KR
      const keyResult = await storage.getKeyResult(keyResultId);
      
      res.json({
        success: true,
        keyResult,
        message: `Progress recalculated for KR ${keyResultId}`
      });
    } catch (error) {
      console.error("Test error:", error);
      res.status(500).json({ message: "Erro no teste", error: error instanceof Error ? error.message : 'Erro desconhecido' });
    }
  });

  // Admin Configuration Management Routes
  // Strategic Indicators Management
  app.post("/api/admin/strategic-indicators", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const { name, description, unit } = req.body;
      
      if (!name || name.trim() === "") {
        return res.status(400).json({ message: "Nome é obrigatório" });
      }
      
      const indicator = await storage.createStrategicIndicator({ name, description, unit });
      res.json(indicator);
    } catch (error) {
      console.error("Error creating strategic indicator:", error);
      res.status(500).json({ message: "Erro ao criar indicador estratégico" });
    }
  });

  app.put("/api/admin/strategic-indicators/:id", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, description, unit } = req.body;
      
      if (!name || name.trim() === "") {
        return res.status(400).json({ message: "Nome é obrigatório" });
      }
      
      const indicator = await storage.updateStrategicIndicator(id, { name, description, unit });
      res.json(indicator);
    } catch (error) {
      console.error("Error updating strategic indicator:", error);
      res.status(500).json({ message: "Erro ao atualizar indicador estratégico" });
    }
  });

  app.delete("/api/admin/strategic-indicators/:id", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if indicator is being used
      const keyResults = await storage.getKeyResults({});
      const isUsed = keyResults.some(kr => {
        const indicators = Array.isArray(kr.strategicIndicatorIds) 
          ? kr.strategicIndicatorIds 
          : JSON.parse(kr.strategicIndicatorIds || "[]");
        return indicators.includes(id);
      });
      
      if (isUsed) {
        return res.status(400).json({ 
          message: "Não é possível excluir indicador que está sendo usado em resultados-chave" 
        });
      }
      
      await storage.deleteStrategicIndicator(id);
      res.json({ message: "Indicador estratégico excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting strategic indicator:", error);
      res.status(500).json({ message: "Erro ao excluir indicador estratégico" });
    }
  });

  // Regions Management
  app.post("/api/admin/regions", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const { name, code } = req.body;
      
      if (!name || name.trim() === "" || !code || code.trim() === "") {
        return res.status(400).json({ message: "Nome e código são obrigatórios" });
      }
      
      const region = await storage.createRegion({ name, code });
      res.json(region);
    } catch (error) {
      console.error("Error creating region:", error);
      res.status(500).json({ message: "Erro ao criar região" });
    }
  });

  app.put("/api/admin/regions/:id", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, code } = req.body;
      
      if (!name || name.trim() === "" || !code || code.trim() === "") {
        return res.status(400).json({ message: "Nome e código são obrigatórios" });
      }
      
      const region = await storage.updateRegion(id, { name, code });
      res.json(region);
    } catch (error) {
      console.error("Error updating region:", error);
      res.status(500).json({ message: "Erro ao atualizar região" });
    }
  });

  app.delete("/api/admin/regions/:id", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if region is being used
      const objectives = await storage.getObjectives({});
      const subRegions = await storage.getSubRegions();
      
      const isUsedInObjectives = objectives.some(obj => obj.regionId === id);
      const hasSubRegions = subRegions.some(sr => sr.regionId === id);
      
      if (isUsedInObjectives || hasSubRegions) {
        return res.status(400).json({ 
          message: "Não é possível excluir região que possui objetivos ou sub-regiões associadas" 
        });
      }
      
      await storage.deleteRegion(id);
      res.json({ message: "Região excluída com sucesso" });
    } catch (error) {
      console.error("Error deleting region:", error);
      res.status(500).json({ message: "Erro ao excluir região" });
    }
  });

  // Sub-regions Management
  app.post("/api/admin/sub-regions", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const { name, code, regionId } = req.body;
      
      if (!name || name.trim() === "" || !code || code.trim() === "" || !regionId) {
        return res.status(400).json({ message: "Nome, código e região são obrigatórios" });
      }
      
      const subRegion = await storage.createSubRegion({ name, code, regionId });
      res.json(subRegion);
    } catch (error) {
      console.error("Error creating sub-region:", error);
      res.status(500).json({ message: "Erro ao criar sub-região" });
    }
  });

  app.put("/api/admin/sub-regions/:id", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, code, regionId } = req.body;
      
      if (!name || name.trim() === "" || !code || code.trim() === "" || !regionId) {
        return res.status(400).json({ message: "Nome, código e região são obrigatórios" });
      }
      
      const subRegion = await storage.updateSubRegion(id, { name, code, regionId });
      res.json(subRegion);
    } catch (error) {
      console.error("Error updating sub-region:", error);
      res.status(500).json({ message: "Erro ao atualizar sub-região" });
    }
  });

  app.delete("/api/admin/sub-regions/:id", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if sub-region is being used
      const objectives = await storage.getObjectives({});
      const isUsed = objectives.some(obj => obj.subRegionId === id);
      
      if (isUsed) {
        return res.status(400).json({ 
          message: "Não é possível excluir sub-região que possui objetivos associados" 
        });
      }
      
      await storage.deleteSubRegion(id);
      res.json({ message: "Sub-região excluída com sucesso" });
    } catch (error) {
      console.error("Error deleting sub-region:", error);
      res.status(500).json({ message: "Erro ao excluir sub-região" });
    }
  });

  // Solutions Management
  app.post("/api/admin/solutions", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const { name, description } = req.body;
      
      if (!name || name.trim() === "") {
        return res.status(400).json({ message: "Nome é obrigatório" });
      }
      
      const solution = await storage.createSolution({ name, description });
      res.json(solution);
    } catch (error) {
      console.error("Error creating solution:", error);
      res.status(500).json({ message: "Erro ao criar solução" });
    }
  });

  app.put("/api/admin/solutions/:id", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, description } = req.body;
      
      if (!name || name.trim() === "") {
        return res.status(400).json({ message: "Nome é obrigatório" });
      }
      
      const solution = await storage.updateSolution(id, { name, description });
      res.json(solution);
    } catch (error) {
      console.error("Error updating solution:", error);
      res.status(500).json({ message: "Erro ao atualizar solução" });
    }
  });

  app.delete("/api/admin/solutions/:id", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if solution is being used
      const serviceLines = await storage.getServiceLines();
      const hasServiceLines = serviceLines.some(sl => sl.solutionId === id);
      
      if (hasServiceLines) {
        return res.status(400).json({ 
          message: "Não é possível excluir solução que possui linhas de serviço associadas" 
        });
      }
      
      await storage.deleteSolution(id);
      res.json({ message: "Solução excluída com sucesso" });
    } catch (error) {
      console.error("Error deleting solution:", error);
      res.status(500).json({ message: "Erro ao excluir solução" });
    }
  });

  // Service Lines Management
  app.post("/api/admin/service-lines", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const { name, description, solutionId } = req.body;
      
      if (!name || name.trim() === "" || !solutionId) {
        return res.status(400).json({ message: "Nome e solução são obrigatórios" });
      }
      
      const serviceLine = await storage.createServiceLine({ name, description, solutionId });
      res.json(serviceLine);
    } catch (error) {
      console.error("Error creating service line:", error);
      res.status(500).json({ message: "Erro ao criar linha de serviço" });
    }
  });

  app.put("/api/admin/service-lines/:id", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, description, solutionId } = req.body;
      
      if (!name || name.trim() === "" || !solutionId) {
        return res.status(400).json({ message: "Nome e solução são obrigatórios" });
      }
      
      const serviceLine = await storage.updateServiceLine(id, { name, description, solutionId });
      res.json(serviceLine);
    } catch (error) {
      console.error("Error updating service line:", error);
      res.status(500).json({ message: "Erro ao atualizar linha de serviço" });
    }
  });

  app.delete("/api/admin/service-lines/:id", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if service line is being used
      const services = await storage.getServices();
      const objectives = await storage.getObjectives({});
      const keyResults = await storage.getKeyResults({});
      
      const hasServices = services.some(s => s.serviceLineId === id);
      const isUsedInObjectives = objectives.some(obj => obj.serviceLineId === id);
      const isUsedInKeyResults = keyResults.some(kr => kr.serviceLineId === id);
      
      if (hasServices || isUsedInObjectives || isUsedInKeyResults) {
        return res.status(400).json({ 
          message: "Não é possível excluir linha de serviço que está sendo utilizada" 
        });
      }
      
      await storage.deleteServiceLine(id);
      res.json({ message: "Linha de serviço excluída com sucesso" });
    } catch (error) {
      console.error("Error deleting service line:", error);
      res.status(500).json({ message: "Erro ao excluir linha de serviço" });
    }
  });

  // Services Management
  app.post("/api/admin/services", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const { name, description, serviceLineId } = req.body;
      
      if (!name || name.trim() === "" || !serviceLineId) {
        return res.status(400).json({ message: "Nome e linha de serviço são obrigatórios" });
      }
      
      const service = await storage.createService({ name, description, serviceLineId });
      res.json(service);
    } catch (error) {
      console.error("Error creating service:", error);
      res.status(500).json({ message: "Erro ao criar serviço" });
    }
  });

  app.put("/api/admin/services/:id", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, description, serviceLineId } = req.body;
      
      if (!name || name.trim() === "" || !serviceLineId) {
        return res.status(400).json({ message: "Nome e linha de serviço são obrigatórios" });
      }
      
      const service = await storage.updateService(id, { name, description, serviceLineId });
      res.json(service);
    } catch (error) {
      console.error("Error updating service:", error);
      res.status(500).json({ message: "Erro ao atualizar serviço" });
    }
  });

  app.delete("/api/admin/services/:id", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if service is being used
      const keyResults = await storage.getKeyResults({});
      const isUsed = keyResults.some(kr => kr.serviceId === id);
      
      if (isUsed) {
        return res.status(400).json({ 
          message: "Não é possível excluir serviço que está sendo utilizado em resultados-chave" 
        });
      }
      
      await storage.deleteService(id);
      res.json({ message: "Serviço excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting service:", error);
      res.status(500).json({ message: "Erro ao excluir serviço" });
    }
  });

  // Import/Export Routes
  app.get("/api/admin/export-template", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      // Create a new workbook
      const workbook = XLSX.utils.book_new();
      
      // Get reference data for examples
      const regions = await storage.getRegions();
      const users = await storage.getUsers();
      const indicators = await storage.getStrategicIndicators();
      
      // Create worksheets for operational data
      const objectivesData = [
        ['titulo', 'descricao', 'data_inicio', 'data_fim', 'status', 'regiao_id', 'responsavel_id'],
        ['Exemplo Objetivo', 'Descrição do objetivo exemplo', '2025-01-01', '2025-12-31', 'active', regions[0]?.id || 1, users[0]?.id || 1]
      ];
      
      const keyResultsData = [
        ['titulo', 'descricao', 'valor_atual', 'valor_meta', 'unidade', 'data_inicio', 'data_fim', 'objetivo_id', 'indicadores_estrategicos'],
        ['Exemplo Resultado-Chave', 'Descrição do resultado-chave exemplo', '0', '100', '%', '2025-01-01', '2025-12-31', 1, indicators[0]?.id ? `[${indicators[0].id}]` : '[]']
      ];
      
      const actionsData = [
        ['titulo', 'descricao', 'data_vencimento', 'prioridade', 'status', 'resultado_chave_id', 'responsavel_id'],
        ['Exemplo Ação', 'Descrição da ação exemplo', '2025-06-30', 'high', 'pending', 1, users[0]?.id || 1]
      ];
      
      // Add worksheets to workbook
      const objectivesWS = XLSX.utils.aoa_to_sheet(objectivesData);
      const keyResultsWS = XLSX.utils.aoa_to_sheet(keyResultsData);
      const actionsWS = XLSX.utils.aoa_to_sheet(actionsData);
      
      XLSX.utils.book_append_sheet(workbook, objectivesWS, "Objetivos");
      XLSX.utils.book_append_sheet(workbook, keyResultsWS, "Resultados-Chave");
      XLSX.utils.book_append_sheet(workbook, actionsWS, "Ações");
      
      // Generate buffer
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Disposition', 'attachment; filename=modelo_okr_dados.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);
    } catch (error) {
      console.error("Error generating template:", error);
      res.status(500).json({ message: "Erro ao gerar modelo Excel" });
    }
  });

  app.post("/api/admin/import-data", requireAuth, requireRole(["admin"]), upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo fornecido" });
      }
      
      // Parse Excel file
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      let imported = 0;
      const errors: string[] = [];
      
      // Import Objectives first
      if (workbook.SheetNames.includes('Objetivos')) {
        const sheet = workbook.Sheets['Objetivos'];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        for (let i = 1; i < data.length; i++) { // Skip header row
          const row = data[i] as any[];
          if (row && row[0]) { // Must have title
            try {
              const objectiveData = {
                title: row[0],
                description: row[1] || "",
                startDate: row[2],
                endDate: row[3],
                status: row[4] || "active",
                regionId: parseInt(row[5]) || null,
                ownerId: parseInt(row[6]) || req.user.id
              };
              
              await storage.createObjective(objectiveData);
              imported++;
            } catch (error) {
              errors.push(`Erro ao importar objetivo ${row[0]}: ${error}`);
              console.log(`Error importing objective ${row[0]}:`, error);
            }
          }
        }
      }
      
      // Import Key Results (after objectives)
      if (workbook.SheetNames.includes('Resultados-Chave')) {
        const sheet = workbook.Sheets['Resultados-Chave'];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        for (let i = 1; i < data.length; i++) {
          const row = data[i] as any[];
          if (row && row[0] && row[7]) { // Must have title and objective_id
            try {
              const keyResultData = {
                title: row[0],
                description: row[1] || "",
                currentValue: convertBRToDatabase(row[2]?.toString() || "0"),
                targetValue: convertBRToDatabase(row[3]?.toString() || "100"),
                unit: row[4] || "",
                startDate: row[5],
                endDate: row[6],
                objectiveId: parseInt(row[7]),
                strategicIndicatorIds: row[8] || "[]"
              };
              
              await storage.createKeyResult(keyResultData);
              imported++;
            } catch (error) {
              errors.push(`Erro ao importar resultado-chave ${row[0]}: ${error}`);
              console.log(`Error importing key result ${row[0]}:`, error);
            }
          }
        }
      }
      
      // Import Actions (after key results)
      if (workbook.SheetNames.includes('Ações')) {
        const sheet = workbook.Sheets['Ações'];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        for (let i = 1; i < data.length; i++) {
          const row = data[i] as any[];
          if (row && row[0] && row[5]) { // Must have title and key result id
            try {
              const actionData = {
                title: row[0],
                description: row[1] || "",
                dueDate: row[2],
                priority: row[3] || "medium",
                status: row[4] || "pending",
                keyResultId: parseInt(row[5]),
                ownerId: parseInt(row[6]) || req.user.id
              };
              
              await storage.createAction(actionData);
              imported++;
            } catch (error) {
              errors.push(`Erro ao importar ação ${row[0]}: ${error}`);
              console.log(`Error importing action ${row[0]}:`, error);
            }
          }
        }
      }
      
      res.json({ 
        message: "Dados importados com sucesso", 
        imported,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error("Error importing data:", error);
      res.status(500).json({ message: "Erro ao importar dados" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
