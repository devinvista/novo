import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertObjectiveSchema, insertKeyResultSchema, insertActionSchema, insertUserSchema } from "@shared/schema";
import { hashPassword } from "./auth";
import { z } from "zod";
// Removed parseDecimalBR - using parseFloat directly

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
      const validation = insertObjectiveSchema.partial().parse(req.body);
      
      const existingObjective = await storage.getObjective(id, req.user.id);
      if (!existingObjective) {
        return res.status(404).json({ message: "Objetivo não encontrado ou sem acesso" });
      }
      
      const objective = await storage.updateObjective(id, validation);
      res.json(objective);
    } catch (error) {
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
      const keyResults = await storage.getKeyResults(objectiveId, req.user.id);
      console.log("Key results found:", keyResults.length);
      
      // Debug the specific Key Result Teste
      const testKR = keyResults.find(kr => kr.title === 'Key Result Teste');
      if (testKR) {
        console.log('🔍 API Response - Key Result Teste:', {
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
      res.json(keyResults);
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
      
      // Keep values as strings for Zod schema validation
      if (requestData.targetValue && typeof requestData.targetValue === 'number') {
        requestData.targetValue = requestData.targetValue.toString();
      }
      // Remove initialValue handling - not in MySQL schema
      
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
      const validation = insertKeyResultSchema.partial().parse(req.body);
      
      const existingKeyResult = await storage.getKeyResult(id, req.user.id);
      if (!existingKeyResult) {
        return res.status(404).json({ message: "Resultado-chave não encontrado ou sem acesso" });
      }
      
      const updateData = { ...validation };
      if (updateData.targetValue !== undefined) {
        updateData.targetValue = updateData.targetValue.toString();
      }
      const keyResult = await storage.updateKeyResult(id, updateData);
      
      res.json(keyResult);
    } catch (error) {
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
      const actions = await storage.getActions(keyResultId, req.user.id);
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
      res.json(checkpoints);
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
      
      const updated = await storage.updateCheckpoint(id, {
        actualValue: actualValue.toString(),
        status: status || "pending",
      });
      
      res.json(updated);
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

  app.put("/api/checkpoints/:id", requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { actualValue, notes } = req.body;
      
      const existingCheckpoint = await storage.getCheckpoint(id, req.user.id);
      if (!existingCheckpoint) {
        return res.status(404).json({ message: "Checkpoint não encontrado ou sem acesso" });
      }
      
      // Calculate progress
      const targetValue = parseFloat(existingCheckpoint.targetValue);
      const actual = parseFloat(actualValue);
      const progress = targetValue > 0 ? (actual / targetValue) * 100 : 0;
      
      const checkpoint = await storage.updateCheckpoint(id, {
        actualValue: actualValue.toString(),
        notes,
        status: 'completed',
      });
      
      res.json(checkpoint);
    } catch (error) {
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

  // TODO: Implement activities feature if needed

  // User management routes with hierarchical access control
  app.get("/api/users", requireAuth, async (req: any, res) => {
    try {
      const currentUserId = req.user?.id;
      const users = await storage.getUsers(currentUserId);
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
      const pendingUsers = await storage.getPendingUsers(currentUserId);
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

  const httpServer = createServer(app);
  return httpServer;
}
