import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertObjectiveSchema, insertKeyResultSchema, insertActionSchema } from "@shared/schema";
import { z } from "zod";

export function registerRoutes(app: Express): Server {
  // Setup authentication routes
  setupAuth(app);

  // Reference data routes
  app.get("/api/solutions", async (req, res) => {
    try {
      const solutions = await storage.getSolutions();
      res.json(solutions);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar soluções" });
    }
  });

  app.get("/api/regions", async (req, res) => {
    try {
      const regions = await storage.getRegions();
      res.json(regions);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar regiões" });
    }
  });

  app.get("/api/sub-regions", async (req, res) => {
    try {
      const regionId = req.query.regionId ? parseInt(req.query.regionId as string) : undefined;
      const subRegions = await storage.getSubRegions(regionId);
      res.json(subRegions);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar sub-regiões" });
    }
  });

  app.get("/api/service-lines", async (req, res) => {
    try {
      const solutionId = req.query.solutionId ? parseInt(req.query.solutionId as string) : undefined;
      const serviceLines = await storage.getServiceLines(solutionId);
      res.json(serviceLines);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar linhas de serviço" });
    }
  });

  app.get("/api/services", async (req, res) => {
    try {
      const serviceLineId = req.query.serviceLineId ? parseInt(req.query.serviceLineId as string) : undefined;
      const services = await storage.getServices(serviceLineId);
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
  app.get("/api/dashboard/kpis", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const filters = {
        regionId: req.query.regionId ? parseInt(req.query.regionId as string) : undefined,
        subRegionId: req.query.subRegionId ? parseInt(req.query.subRegionId as string) : undefined,
      };
      
      const kpis = await storage.getDashboardKPIs(filters);
      res.json(kpis);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar KPIs do dashboard" });
    }
  });

  // Objectives routes
  app.get("/api/objectives", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const filters = {
        regionId: req.query.regionId ? parseInt(req.query.regionId as string) : undefined,
        subRegionId: req.query.subRegionId ? parseInt(req.query.subRegionId as string) : undefined,
        serviceLineId: req.query.serviceLineId ? parseInt(req.query.serviceLineId as string) : undefined,
        ownerId: req.user?.role !== 'admin' ? req.user?.id : undefined,
      };
      
      const objectives = await storage.getObjectives(filters);
      res.json(objectives);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar objetivos" });
    }
  });

  app.get("/api/objectives/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const objective = await storage.getObjective(id);
      
      if (!objective) {
        return res.status(404).json({ message: "Objetivo não encontrado" });
      }
      
      res.json(objective);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar objetivo" });
    }
  });

  app.post("/api/objectives", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const validation = insertObjectiveSchema.parse(req.body);
      const objective = await storage.createObjective(validation);
      
      // Log activity
      await storage.logActivity({
        userId: req.user!.id,
        entityType: 'objective',
        entityId: objective.id,
        action: 'created',
        description: `Criou o objetivo "${objective.title}"`,
        newValues: objective,
      });
      
      res.status(201).json(objective);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao criar objetivo" });
    }
  });

  app.put("/api/objectives/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const validation = insertObjectiveSchema.partial().parse(req.body);
      
      const existingObjective = await storage.getObjective(id);
      if (!existingObjective) {
        return res.status(404).json({ message: "Objetivo não encontrado" });
      }
      
      const objective = await storage.updateObjective(id, validation);
      
      // Log activity
      await storage.logActivity({
        userId: req.user!.id,
        entityType: 'objective',
        entityId: objective.id,
        action: 'updated',
        description: `Atualizou o objetivo "${objective.title}"`,
        oldValues: existingObjective,
        newValues: objective,
      });
      
      res.json(objective);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao atualizar objetivo" });
    }
  });

  app.delete("/api/objectives/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      
      const existingObjective = await storage.getObjective(id);
      if (!existingObjective) {
        return res.status(404).json({ message: "Objetivo não encontrado" });
      }
      
      await storage.deleteObjective(id);
      
      // Log activity
      await storage.logActivity({
        userId: req.user!.id,
        entityType: 'objective',
        entityId: id,
        action: 'deleted',
        description: `Deletou o objetivo "${existingObjective.title}"`,
        oldValues: existingObjective,
      });
      
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Erro ao deletar objetivo" });
    }
  });

  // Key Results routes
  app.get("/api/key-results", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const objectiveId = req.query.objectiveId ? parseInt(req.query.objectiveId as string) : undefined;
      const keyResults = await storage.getKeyResults(objectiveId);
      res.json(keyResults);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar resultados-chave" });
    }
  });

  app.post("/api/key-results", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
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
      
      const validation = insertKeyResultSchema.parse(requestData);
      
      // Calculate initial status based on dates
      const startDate = new Date(validation.startDate);
      const endDate = new Date(validation.endDate);
      const today = new Date();
      
      let status = validation.status || 'active';
      if (today < startDate) {
        status = 'pending';
      } else if (today > endDate && parseFloat(validation.currentValue) < parseFloat(validation.targetValue)) {
        status = 'delayed';
      }
      
      const keyResult = await storage.createKeyResult({
        ...validation,
        startDate: validation.startDate,
        endDate: validation.endDate,
        status,
      });
      
      // Log activity - remove updatedAt field
      await storage.logActivity({
        userId: req.user!.id,
        entityType: 'key_result',
        entityId: keyResult.id,
        action: 'created',
        description: `Criou o resultado-chave "${keyResult.title}"`,
        newValues: keyResult,
      });
      
      res.status(201).json(keyResult);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao criar resultado-chave" });
    }
  });

  app.put("/api/key-results/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const validation = insertKeyResultSchema.partial().parse(req.body);
      
      const existingKeyResult = await storage.getKeyResult(id);
      if (!existingKeyResult) {
        return res.status(404).json({ message: "Resultado-chave não encontrado" });
      }
      
      const keyResult = await storage.updateKeyResult(id, validation);
      
      // Log activity
      await storage.logActivity({
        userId: req.user!.id,
        entityType: 'key_result',
        entityId: keyResult.id,
        action: 'updated',
        description: `Atualizou o resultado-chave "${keyResult.title}"`,
        oldValues: existingKeyResult,
        newValues: keyResult,
      });
      
      res.json(keyResult);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao atualizar resultado-chave" });
    }
  });

  // Actions routes
  app.get("/api/actions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const keyResultId = req.query.keyResultId ? parseInt(req.query.keyResultId as string) : undefined;
      const actions = await storage.getActions(keyResultId);
      res.json(actions);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar ações" });
    }
  });

  app.post("/api/actions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    console.log("Action creation request:", {
      authenticated: req.isAuthenticated(),
      userId: req.user?.id,
      body: req.body
    });
    
    try {
      // Clean up null values
      const requestData = { ...req.body };
      if (requestData.responsibleId === null) requestData.responsibleId = undefined;
      if (requestData.strategicIndicatorId === null) requestData.strategicIndicatorId = undefined;
      if (requestData.dueDate === null || requestData.dueDate === "") requestData.dueDate = undefined;
      
      const validation = insertActionSchema.parse(requestData);
      console.log("Validated action data:", validation);
      
      const action = await storage.createAction(validation);
      console.log("Created action:", action);
      
      // Log activity
      await storage.logActivity({
        userId: req.user!.id,
        entityType: 'action',
        entityId: action.id,
        action: 'created',
        description: `Criou a ação "${action.title}"`,
        newValues: action,
      });
      
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

  // Checkpoints routes
  app.get("/api/checkpoints", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const keyResultId = req.query.keyResultId ? parseInt(req.query.keyResultId as string) : undefined;
      console.log(`Fetching checkpoints for keyResultId: ${keyResultId}`);
      const checkpoints = await storage.getCheckpoints(keyResultId);
      console.log(`Found ${checkpoints.length} checkpoints`);
      res.json(checkpoints);
    } catch (error) {
      console.error("Error fetching checkpoints:", error);
      res.status(500).json({ message: "Erro ao buscar checkpoints" });
    }
  });

  app.post("/api/checkpoints/:id/update", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const { actualValue, status } = req.body;
      
      const updated = await storage.updateCheckpoint(id, {
        actualValue: actualValue.toString(),
        status: status || "pending",
      });
      
      // Log activity
      await storage.logActivity({
        userId: req.user!.id,
        entityType: 'checkpoint',
        entityId: updated.id,
        action: 'updated',
        description: `Atualizou checkpoint para valor ${actualValue}`,
        newValues: { actualValue, status },
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating checkpoint:", error);
      res.status(500).json({ message: "Erro ao atualizar checkpoint" });
    }
  });

  app.post("/api/key-results/:id/regenerate-checkpoints", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const keyResultId = parseInt(req.params.id);
      const checkpoints = await storage.generateCheckpoints(keyResultId);
      
      // Log activity
      await storage.logActivity({
        userId: req.user!.id,
        entityType: 'key_result',
        entityId: keyResultId,
        action: 'regenerated_checkpoints',
        description: `Regenerou ${checkpoints.length} checkpoints`,
        newValues: { checkpointCount: checkpoints.length },
      });
      
      res.json(checkpoints);
    } catch (error) {
      console.error("Error regenerating checkpoints:", error);
      res.status(500).json({ message: "Erro ao regenerar checkpoints" });
    }
  });

  app.put("/api/checkpoints/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const { actualValue, notes } = req.body;
      
      const existingCheckpoint = await storage.getCheckpoint(id);
      if (!existingCheckpoint) {
        return res.status(404).json({ message: "Checkpoint não encontrado" });
      }
      
      // Calculate progress
      const targetValue = parseFloat(existingCheckpoint.targetValue);
      const actual = parseFloat(actualValue);
      const progress = targetValue > 0 ? (actual / targetValue) * 100 : 0;
      
      const checkpoint = await storage.updateCheckpoint(id, {
        actualValue: actualValue.toString(),
        progress: progress.toString(),
        notes,
        status: 'completed',
        completedAt: new Date(),
      });
      
      // Log activity
      await storage.logActivity({
        userId: req.user!.id,
        entityType: 'checkpoint',
        entityId: checkpoint.id,
        action: 'completed',
        description: `Completou o checkpoint do período ${checkpoint.period}`,
        oldValues: existingCheckpoint,
        newValues: checkpoint,
      });
      
      res.json(checkpoint);
    } catch (error) {
      res.status(500).json({ message: "Erro ao atualizar checkpoint" });
    }
  });

  // Recent activities
  app.get("/api/activities", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const activities = await storage.getRecentActivities(limit);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar atividades" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
