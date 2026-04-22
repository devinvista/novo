import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertObjectiveSchema, insertKeyResultSchema, insertActionSchema, insertUserSchema } from "@shared/schema";
import { hashPassword } from "./auth";
import { cached, invalidateLookupCache } from "./cache";
import { z } from "zod";
import { formatDecimalBR, formatNumberBR, convertBRToDatabase, formatBrazilianNumber } from "./formatters";
import { recalcKeyResultFromCheckpoints } from "./domain/checkpoints/recalc";
import { lookupsRouter } from "./modules/lookups/lookups.routes";
import { actionCommentsRouter } from "./modules/action-comments/action-comments.routes";
import { adminLookupsRouter } from "./modules/admin-lookups/admin-lookups.routes";
import ExcelJS from "exceljs";
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
      cb(new Error('Tipo de arquivo inválido. Apenas arquivos Excel são permitidos.'));
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

// Remove password from user object before sending to client
function sanitizeUser(user: any) {
  if (!user) return user;
  const { password, ...safeUser } = user;
  return safeUser;
}

function sanitizeUsers(users: any[]) {
  return users.map(sanitizeUser);
}

function requireRole(roles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Permissões insuficientes" });
    }
    next();
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Auto-invalidate lookup caches after any successful admin mutation
  app.use("/api/admin", (req, res, next) => {
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
    res.on("finish", () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        invalidateLookupCache();
      }
    });
    next();
  });

  // Modular routers (extracted from this file). Mounted under /api.
  app.use("/api", lookupsRouter);
  app.use("/api", actionCommentsRouter);
  app.use("/api/admin", adminLookupsRouter);

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
      
      // Aplicar filtros de linha de serviço e outros filtros
      const filters = {
        regionId: req.query.regionId ? parseInt(req.query.regionId as string) : undefined,
        subRegionId: req.query.subRegionId ? parseInt(req.query.subRegionId as string) : undefined,
        serviceLineId: req.query.serviceLineId ? parseInt(req.query.serviceLineId as string) : undefined,
        currentUserId: currentUser.id,
      };
      
      const data = await storage.getQuarterlyData(quarter, currentUser.id, filters);
      
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
        
        if (validation.regionId && userRegionIds.length > 0 && !(userRegionIds as any[]).includes(validation.regionId)) {
          return res.status(403).json({ message: "Sem permissão para criar objetivo nesta região" });
        }
        const subRegionIdsArr = Array.isArray(validation.subRegionIds) ? validation.subRegionIds as any[] : [];
        if (subRegionIdsArr.length > 0 && userSubRegionIds.length > 0 && !subRegionIdsArr.some((id: any) => (userSubRegionIds as any[]).includes(id))) {
          return res.status(403).json({ message: "Sem permissão para criar objetivo nesta subregião" });
        }
      }
      
      // LÓGICA DE RESPONSABILIDADE AUTOMÁTICA:
      // O responsável pelo objetivo é o gestor da sub-região ou região
      // Se há múltiplos gestores, o responsável é o gestor da região que criou o objetivo
      
      let responsibleId = validation.ownerId;
      
      if (currentUser.role === 'gestor') {
        // Se é um gestor criando, ele automaticamente se torna o responsável
        responsibleId = currentUser.id;
      } else if (currentUser.role === 'admin') {
        // Se é admin, buscar o gestor apropriado para a região/sub-região
        try {
          const managers = await storage.getManagers();
          
          // Priorizar gestores das sub-regiões específicas
          const valSubRegionIds = Array.isArray(validation.subRegionIds) ? validation.subRegionIds as any[] : [];
          if (valSubRegionIds.length > 0) {
            const subRegionManager = managers.find(manager => {
              const mgrSubIds = Array.isArray(manager.subRegionIds) ? manager.subRegionIds as any[] : [];
              return mgrSubIds.length > 0 && valSubRegionIds.some((subRegionId: any) => mgrSubIds.includes(subRegionId));
            });
            if (subRegionManager) {
              responsibleId = subRegionManager.id;
            }
          }
          
          // Se não encontrou por sub-região, buscar por região
          if (!responsibleId && validation.regionId) {
            const regionManager = managers.find(manager => {
              const mgrRegIds = Array.isArray(manager.regionIds) ? manager.regionIds as any[] : [];
              return mgrRegIds.includes(validation.regionId);
            });
            if (regionManager) {
              responsibleId = regionManager.id;
            }
          }
          
        } catch (error) {
          console.error('Erro ao buscar gestores para definir responsável:', error);
          // Em caso de erro, manter o criador como responsável
          responsibleId = currentUser.id;
        }
      }
      
      // Atualizar o objeto com o responsável correto
      const objectiveData = {
        ...validation,
        ownerId: responsibleId
      };
      
      const objective = await storage.createObjective(objectiveData);
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
      console.error(`❌ Erro ao atualizar objetivo ${req.params.id}:`, error);
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
      const filters = {
        objectiveId: req.query.objectiveId ? parseInt(req.query.objectiveId as string) : undefined,
        regionId: req.query.regionId ? parseInt(req.query.regionId as string) : undefined,
        subRegionId: req.query.subRegionId ? parseInt(req.query.subRegionId as string) : undefined,
        serviceLineId: req.query.serviceLineId ? parseInt(req.query.serviceLineId as string) : undefined,
        currentUserId: req.user.id, // Adicionar controle de acesso
      };
      
      const keyResults = await storage.getKeyResults(filters);
      
      // CONVERSÃO PADRÃO BRASILEIRO: Converter valores do banco para formato brasileiro
      // Usar formatação inteligente (sem decimais desnecessários)
      const keyResultsBR = keyResults.map(kr => ({
        ...kr,
        currentValue: formatBrazilianNumber(kr.currentValue || "0"),
        targetValue: formatBrazilianNumber(kr.targetValue || "0"),
        progress: kr.progress !== null && kr.progress !== undefined ? parseFloat(kr.progress.toString()) : 0
      }));
      
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

      // Recalculate objective progress after KR update
      const objectiveId = keyResult.objectiveId || existingKeyResult.objectiveId;
      if (objectiveId) {
        try {
          const objectiveKRs = await storage.getKeyResults({ objectiveId });
          if (objectiveKRs.length > 0) {
            const totalProgress = objectiveKRs.reduce((sum: number, kr: any) => {
              const current = parseFloat(kr.currentValue || '0');
              const target = parseFloat(kr.targetValue || '1');
              const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;
              return sum + progress;
            }, 0);
            const avgProgress = totalProgress / objectiveKRs.length;
            await storage.updateObjective(objectiveId, { progress: avgProgress.toFixed(2) });
          }
        } catch (objError) {
          console.error('Error updating objective progress from KR update:', objError);
        }
      }

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
      const filters = {
        keyResultId,
        currentUserId: req.user?.id
      };
      
      const actions = await storage.getActions(filters);
      res.json(actions);
    } catch (error) {
      console.error("Error fetching actions:", error);
      res.status(500).json({ message: "Erro ao buscar ações" });
    }
  });

  app.post("/api/actions", requireAuth, async (req: any, res) => {
    try {
      const requestData = { ...req.body };
      if (requestData.responsibleId === null) requestData.responsibleId = undefined;
      if (requestData.dueDate === null || requestData.dueDate === "") requestData.dueDate = undefined;
      
      const validation = insertActionSchema.parse(requestData);
      
      const keyResult = await storage.getKeyResult(validation.keyResultId, req.user.id);
      if (!keyResult) {
        return res.status(403).json({ message: "Sem permissão para criar ação neste resultado-chave" });
      }
      
      const action = await storage.createAction(validation);
      res.status(201).json(action);
    } catch (error) {
      console.error("Error creating action:", error);
      if (error instanceof z.ZodError) {
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
      
      // Check for final status and require completion comment
      const finalStatuses = ['completed', 'cancelled'];
      const currentStatusIsFinal = finalStatuses.includes(existingAction.status);
      const newStatusIsFinal = requestData.status && finalStatuses.includes(requestData.status);
      
      // If changing from non-final to final status, require completion comment
      if (!currentStatusIsFinal && newStatusIsFinal && !requestData.completionComment?.trim()) {
        return res.status(400).json({ 
          message: "Comentário de conclusão é obrigatório ao alterar para status final",
          requiresCompletionComment: true
        });
      }
      
      const validation = insertActionSchema.partial().parse(requestData);
      const updatedAction = await storage.updateAction(id, validation);
      
      // If there's a completion comment, add it as a special comment
      if (requestData.completionComment?.trim()) {
        const statusLabels = {
          completed: 'CONCLUÍDA',
          cancelled: 'CANCELADA'
        };
        
        const statusLabel = statusLabels[requestData.status as keyof typeof statusLabels] || requestData.status?.toUpperCase() || 'DESCONHECIDO';
        
        await storage.createActionComment({
          actionId: id,
          userId: req.user.id,
          comment: `🏁 STATUS FINAL - ${statusLabel}: ${requestData.completionComment}`,
        });
      }
      
      res.json(updatedAction);
    } catch (error) {
      console.error("Error updating action:", error);
      if (error instanceof z.ZodError) {
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

  // Action comments moved to server/modules/action-comments/action-comments.routes.ts

  // Checkpoints routes with hierarchical access control
  app.get("/api/checkpoints", requireAuth, async (req: any, res) => {
    try {
      const keyResultId = req.query.keyResultId ? parseInt(req.query.keyResultId as string) : undefined;
      const checkpoints = await storage.getCheckpoints(keyResultId, req.user.id);
      
      // CONVERSÃO PADRÃO BRASILEIRO: Converter valores para formato brasileiro
      // Usar formatação inteligente (sem decimais desnecessários)
      const checkpointsBR = checkpoints.map(checkpoint => ({
        ...checkpoint,
        actualValue: checkpoint.actualValue ? formatBrazilianNumber(checkpoint.actualValue) : null,
        targetValue: formatBrazilianNumber(checkpoint.targetValue || "0"),
        progress: checkpoint.progress ? parseFloat(checkpoint.progress).toFixed(2) : "0"
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

      // Recalcular currentValue/progress do KR pai (e do objetivo)
      await recalcKeyResultFromCheckpoints(existingCheckpoint.keyResultId);

      // CONVERSÃO PADRÃO BRASILEIRO: Converter resposta para formato brasileiro
      const updatedBR = {
        ...updated,
        actualValue: formatBrazilianNumber(updated.actualValue || "0"),
        targetValue: formatBrazilianNumber(updated.targetValue || "0"),
        progress: updated.progress ? parseFloat(updated.progress).toFixed(2) : "0.00"
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
      const checkpoint = await storage.getCheckpoint(id, req.user.id);
      if (!checkpoint) {
        return res.status(404).json({ message: "Checkpoint não encontrado ou sem acesso" });
      }
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
      
      const existingCheckpoint = await storage.getCheckpoint(id, req.user.id);
      if (!existingCheckpoint) {
        return res.status(404).json({ message: "Checkpoint não encontrado ou sem acesso" });
      }
      
      // Calculate progress
      const targetValue = convertBRToDatabase(existingCheckpoint.targetValue);
      const actual = convertBRToDatabase(actualValue);
      const progress = targetValue > 0 ? (actual / targetValue) * 100 : 0;
      
      // Prepare update data with proper date handling - CORREÇÃO: converter actualValue para formato do banco
      const updateData: any = {
        actualValue: actual.toString(), // Usar valor já convertido para banco
        notes,
        status: status || 'completed',
        progress: progress.toString()
      };
      
      // Handle dates properly - convert ISO strings to Date objects or set current date
      if (status === 'completed') {
        updateData.completedDate = completedDate ? new Date(completedDate) : new Date();
        updateData.completedAt = completedAt ? new Date(completedAt) : new Date();
      } else {
        updateData.completedDate = null;
        updateData.completedAt = null;
      }
      
      // Update checkpoint
      const checkpoint = await storage.updateCheckpoint(id, updateData);

      // Recalcula KR/objetivo a partir de TODOS os checkpoints (independente de status).
      // Garante consistência mesmo quando o usuário só registra atingimento sem concluir.
      await recalcKeyResultFromCheckpoints(existingCheckpoint.keyResultId);

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
      const checkpoints = await storage.getCheckpoints(undefined, currentUserId);
      
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
          currentValue: kr.currentValue ? formatBrazilianNumber(kr.currentValue) : '0',
          targetValue: kr.targetValue ? formatBrazilianNumber(kr.targetValue) : '0'
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
          progress: obj.keyResults && obj.keyResults.length > 0 ? 
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
          activeQuarter: (() => {
            const now = new Date();
            const q = Math.floor(now.getMonth() / 3) + 1;
            return `${now.getFullYear()}-T${q}`;
          })()
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
      
      res.json(sanitizeUsers(users));
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Erro ao buscar usuários" });
    }
  });

  // Public slim endpoint used by registration form (only exposes id and name)
  app.get("/api/managers/public", async (req, res) => {
    try {
      const managers = await storage.getManagers();
      res.json(managers.map((m: any) => ({ id: m.id, name: m.name })));
    } catch (error) {
      console.error("Error fetching public managers:", error);
      res.status(500).json({ message: "Erro ao buscar gestores" });
    }
  });

  app.get("/api/managers", requireAuth, async (req, res) => {
    try {
      const managers = await storage.getManagers();
      res.json(sanitizeUsers(managers));
    } catch (error) {
      console.error("Error fetching managers:", error);
      res.status(500).json({ message: "Erro ao buscar gestores" });
    }
  });

  app.get("/api/pending-users", requireAuth, requireRole(["admin", "gestor"]), async (req: any, res) => {
    try {
      const pendingUsers = await storage.getPendingUsers();
      res.json(sanitizeUsers(pendingUsers));
    } catch (error) {
      console.error("Error fetching pending users:", error);
      res.status(500).json({ message: "Erro ao buscar usuários pendentes" });
    }
  });

  app.post("/api/users", requireAuth, requireRole(["admin", "gestor"]), async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const currentUser = req.user;
      
      // Gestores só podem criar usuários operacionais
      if (currentUser?.role === "gestor" && userData.role !== "operacional") {
        return res.status(403).json({ message: "Gestores só podem criar usuários operacionais" });
      }

      // Validação hierárquica de permissões organizacionais
      if (currentUser?.role === "gestor") {
        // Gestores só podem atribuir permissões dentro do seu escopo
        const currentUserSolutionIds = Array.isArray(currentUser.solutionIds) ? currentUser.solutionIds : [];
        const currentUserServiceLineIds = Array.isArray(currentUser.serviceLineIds) ? currentUser.serviceLineIds : [];
        const currentUserServiceIds = Array.isArray(currentUser.serviceIds) ? currentUser.serviceIds : [];

        // Verificar Soluções - só validar se o gestor tem restrições E o usuário está tentando atribuir algo
        if (userData.solutionIds && Array.isArray(userData.solutionIds) && userData.solutionIds.length > 0) {
          // Se o gestor tem restrições de soluções, validar
          if (currentUserSolutionIds.length > 0) {
            const invalidSolutions = userData.solutionIds.filter((id: number) => 
              !currentUserSolutionIds.includes(id)
            );
            if (invalidSolutions.length > 0) {
              return res.status(403).json({ 
                message: "Você não tem permissão para atribuir estas soluções ao usuário" 
              });
            }
          }
        }

        // Verificar Linhas de Serviço - só validar se o gestor tem restrições E o usuário está tentando atribuir algo
        if (userData.serviceLineIds && Array.isArray(userData.serviceLineIds) && userData.serviceLineIds.length > 0) {
          // Se o gestor tem restrições de linhas, validar
          if (currentUserServiceLineIds.length > 0) {
            const invalidServiceLines = userData.serviceLineIds.filter((id: number) => 
              !currentUserServiceLineIds.includes(id)
            );
            if (invalidServiceLines.length > 0) {
              return res.status(403).json({ 
                message: "Você não tem permissão para atribuir estas linhas de serviço ao usuário" 
              });
            }
          }
        }

        // Verificar Serviços - só validar se o gestor tem restrições E o usuário está tentando atribuir algo
        if (userData.serviceIds && Array.isArray(userData.serviceIds) && userData.serviceIds.length > 0) {
          // Se o gestor tem restrições de serviços, validar
          if (currentUserServiceIds.length > 0) {
            const invalidServices = userData.serviceIds.filter((id: number) => 
              !currentUserServiceIds.includes(id)
            );
            if (invalidServices.length > 0) {
              return res.status(403).json({ 
                message: "Você não tem permissão para atribuir estes serviços ao usuário" 
              });
            }
          }
        }

        // Definir gestorId para usuários operacionais criados por gestores
        if (userData.role === "operacional") {
          (userData as any).gestorId = currentUser.id;
        }
      }

      // Hash password
      userData.password = await hashPassword(userData.password as string);

      // Users created by admins/gestores are auto-approved
      (userData as any).approved = true;

      const user = await storage.createUser(userData);
      res.json(sanitizeUser(user));
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Erro ao criar usuário" });
    }
  });

  app.patch("/api/users/:id", requireAuth, requireRole(["admin", "gestor"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userData = req.body;
      
      const targetUser = await storage.getUser(id);
      if (!targetUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      if (req.user?.role === "gestor") {
        if (targetUser.role !== "operacional" || targetUser.gestorId !== req.user.id) {
          return res.status(403).json({ message: "Sem permissão para editar este usuário" });
        }

        // Validação hierárquica de permissões organizacionais para gestores
        const currentUser = req.user;
        const currentUserSolutionIds = Array.isArray(currentUser.solutionIds) ? currentUser.solutionIds : [];
        const currentUserServiceLineIds = Array.isArray(currentUser.serviceLineIds) ? currentUser.serviceLineIds : [];
        const currentUserServiceIds = Array.isArray(currentUser.serviceIds) ? currentUser.serviceIds : [];

        // Verificar Soluções - só validar se o gestor tem restrições E o usuário está tentando atribuir algo
        if (userData.solutionIds && Array.isArray(userData.solutionIds) && userData.solutionIds.length > 0) {
          // Se o gestor tem restrições de soluções, validar
          if (currentUserSolutionIds.length > 0) {
            const invalidSolutions = userData.solutionIds.filter((id: number) => 
              !currentUserSolutionIds.includes(id)
            );
            if (invalidSolutions.length > 0) {
              return res.status(403).json({ 
                message: "Você não tem permissão para atribuir estas soluções ao usuário" 
              });
            }
          }
        }

        // Verificar Linhas de Serviço - só validar se o gestor tem restrições E o usuário está tentando atribuir algo
        if (userData.serviceLineIds && Array.isArray(userData.serviceLineIds) && userData.serviceLineIds.length > 0) {
          // Se o gestor tem restrições de linhas, validar
          if (currentUserServiceLineIds.length > 0) {
            const invalidServiceLines = userData.serviceLineIds.filter((id: number) => 
              !currentUserServiceLineIds.includes(id)
            );
            if (invalidServiceLines.length > 0) {
              return res.status(403).json({ 
                message: "Você não tem permissão para atribuir estas linhas de serviço ao usuário" 
              });
            }
          }
        }

        // Verificar Serviços - só validar se o gestor tem restrições E o usuário está tentando atribuir algo
        if (userData.serviceIds && Array.isArray(userData.serviceIds) && userData.serviceIds.length > 0) {
          // Se o gestor tem restrições de serviços, validar
          if (currentUserServiceIds.length > 0) {
            const invalidServices = userData.serviceIds.filter((id: number) => 
              !currentUserServiceIds.includes(id)
            );
            if (invalidServices.length > 0) {
              return res.status(403).json({ 
                message: "Você não tem permissão para atribuir estes serviços ao usuário" 
              });
            }
          }
        }
      }

      if (userData.password && userData.password.trim() !== "") {
        userData.password = await hashPassword(userData.password);
      } else {
        delete userData.password;
      }

      const user = await storage.updateUser(id, userData);
      res.json(sanitizeUser(user));
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
      res.json(sanitizeUser(user));
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
      res.json(sanitizeUser(user));
    } catch (error) {
      console.error("Error approving user:", error);
      res.status(500).json({ message: "Erro ao aprovar usuário", error: error instanceof Error ? error.message : 'Erro desconhecido' });
    }
  });

  // Helper: convert ExcelJS row values to a 0-indexed array (ExcelJS uses 1-indexed)
  const rowToArray = (row: ExcelJS.Row): unknown[] => {
    const values = row.values as unknown[];
    if (!Array.isArray(values)) return [];
    // ExcelJS row.values has a leading undefined at index 0 — strip it
    return values.slice(1);
  };

  // Helper: extract plain string from ExcelJS cell (handles formulas, rich text, dates)
  const cellToString = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    if (typeof v === "object" && v !== null) {
      const o = v as Record<string, unknown>;
      if (typeof o.text === "string") return o.text;
      if (typeof o.result !== "undefined") return String(o.result);
      if (Array.isArray(o.richText)) {
        return (o.richText as Array<{ text: string }>).map((r) => r.text).join("");
      }
    }
    return String(v);
  };

  // Import/Export Routes
  app.get("/api/admin/export-template", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const workbook = new ExcelJS.Workbook();

      const regions = await storage.getRegions();
      const users = await storage.getUsers();
      const indicators = await cached("strategic-indicators:all", () =>
        storage.getStrategicIndicators()
      );

      const objectivesWS = workbook.addWorksheet("Objetivos");
      objectivesWS.addRows([
        ["titulo", "descricao", "data_inicio", "data_fim", "status", "regiao_id", "responsavel_id"],
        [
          "Exemplo Objetivo",
          "Descrição do objetivo exemplo",
          "2025-01-01",
          "2025-12-31",
          "active",
          regions[0]?.id || 1,
          users[0]?.id || 1,
        ],
      ]);

      const keyResultsWS = workbook.addWorksheet("Resultados-Chave");
      keyResultsWS.addRows([
        [
          "titulo",
          "descricao",
          "valor_atual",
          "valor_meta",
          "unidade",
          "data_inicio",
          "data_fim",
          "objetivo_id",
          "indicadores_estrategicos",
        ],
        [
          "Exemplo Resultado-Chave",
          "Descrição do resultado-chave exemplo",
          "0",
          "100",
          "%",
          "2025-01-01",
          "2025-12-31",
          1,
          indicators[0]?.id ? `[${indicators[0].id}]` : "[]",
        ],
      ]);

      const actionsWS = workbook.addWorksheet("Ações");
      actionsWS.addRows([
        ["titulo", "descricao", "data_vencimento", "prioridade", "status", "resultado_chave_id", "responsavel_id"],
        [
          "Exemplo Ação",
          "Descrição da ação exemplo",
          "2025-06-30",
          "high",
          "pending",
          1,
          users[0]?.id || 1,
        ],
      ]);

      const buffer = await workbook.xlsx.writeBuffer();

      res.setHeader("Content-Disposition", "attachment; filename=modelo_okr_dados.xlsx");
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      res.send(Buffer.from(buffer as ArrayBuffer) as any);
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

      const workbook = new ExcelJS.Workbook();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await workbook.xlsx.load(req.file.buffer as any);
      let imported = 0;
      const errors: string[] = [];

      // Import Objectives first
      const objectivesSheet = workbook.getWorksheet("Objetivos");
      if (objectivesSheet) {
        const lastRow = objectivesSheet.actualRowCount;
        for (let i = 2; i <= lastRow; i++) {
          const row = rowToArray(objectivesSheet.getRow(i));
          const title = cellToString(row[0]);
          if (title) {
            try {
              const objectiveData = {
                title,
                description: cellToString(row[1]),
                startDate: cellToString(row[2]),
                endDate: cellToString(row[3]),
                status: cellToString(row[4]) || "active",
                regionId: parseInt(cellToString(row[5])) || null,
                ownerId: parseInt(cellToString(row[6])) || req.user!.id,
              };
              await storage.createObjective(objectiveData);
              imported++;
            } catch (error) {
              errors.push(`Erro ao importar objetivo ${title}: ${error}`);
              console.log(`Error importing objective ${title}:`, error);
            }
          }
        }
      }

      // Import Key Results (after objectives)
      const krSheet = workbook.getWorksheet("Resultados-Chave");
      if (krSheet) {
        const lastRow = krSheet.actualRowCount;
        for (let i = 2; i <= lastRow; i++) {
          const row = rowToArray(krSheet.getRow(i));
          const title = cellToString(row[0]);
          const objectiveIdStr = cellToString(row[7]);
          if (title && objectiveIdStr) {
            try {
              const keyResultData = {
                title,
                description: cellToString(row[1]),
                currentValue: convertBRToDatabase(cellToString(row[2]) || "0").toString(),
                targetValue: convertBRToDatabase(cellToString(row[3]) || "100").toString(),
                unit: cellToString(row[4]),
                startDate: cellToString(row[5]),
                endDate: cellToString(row[6]),
                frequency: cellToString(row[9]) || "monthly",
                objectiveId: parseInt(objectiveIdStr),
                strategicIndicatorIds: cellToString(row[8]) || "[]",
              };
              await storage.createKeyResult(keyResultData);
              imported++;
            } catch (error) {
              errors.push(`Erro ao importar resultado-chave ${title}: ${error}`);
              console.log(`Error importing key result ${title}:`, error);
            }
          }
        }
      }

      // Import Actions (after key results)
      const actionsSheet = workbook.getWorksheet("Ações");
      if (actionsSheet) {
        const lastRow = actionsSheet.actualRowCount;
        for (let i = 2; i <= lastRow; i++) {
          const row = rowToArray(actionsSheet.getRow(i));
          const title = cellToString(row[0]);
          const krIdStr = cellToString(row[5]);
          if (title && krIdStr) {
            try {
              const actionData = {
                title,
                description: cellToString(row[1]),
                dueDate: cellToString(row[2]),
                priority: cellToString(row[3]) || "medium",
                status: cellToString(row[4]) || "pending",
                keyResultId: parseInt(krIdStr),
                responsibleId: parseInt(cellToString(row[6])) || req.user!.id,
              };
              await storage.createAction(actionData);
              imported++;
            } catch (error) {
              errors.push(`Erro ao importar ação ${title}: ${error}`);
              console.log(`Error importing action ${title}:`, error);
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
