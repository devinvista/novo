import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertObjectiveSchema, insertKeyResultSchema, insertActionSchema, insertUserSchema } from "@shared/schema";
import { hashPassword } from "./auth";
import { z } from "zod";

// Authentication middleware
function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

function requireRole(roles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
}

export function registerRoutes(app: Express): Server {
  // Setup authentication routes
  setupAuth(app);

  // Public user registration route
  app.post("/api/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Public registration creates users as not approved by default
      userData.approved = false;
      
      // Hash password
      userData.password = await hashPassword(userData.password);

      const user = await storage.createUser(userData);
      res.json({ message: "Usuário registrado com sucesso! Aguarde aprovação de um gestor." });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ message: "Erro ao registrar usuário" });
    }
  });

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
      
      // TODO: Implement activity logging if needed
      
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
      
      // TODO: Implement activity logging if needed
      
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
      
      // TODO: Implement activity logging if needed
      
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
      console.log("Fetching key results for objectiveId:", objectiveId);
      const keyResults = await storage.getKeyResults(objectiveId);
      console.log("Key results found:", keyResults.length);
      res.json(keyResults);
    } catch (error) {
      console.error("Error in /api/key-results:", error);
      res.status(500).json({ message: "Erro ao buscar resultados-chave", error: error.message });
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
      
      // TODO: Implement activity logging if needed
      
      res.status(201).json(keyResult);
    } catch (error) {
      console.error('Error in key-results creation:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao criar resultado-chave", error: error.message });
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
      
      // TODO: Implement activity logging if needed
      
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
      
      // TODO: Implement activity logging if needed
      
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
      
      // TODO: Implement activity logging if needed
      
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
      
      // TODO: Implement activity logging if needed
      
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
        notes,
        status: 'completed',
      });
      
      // TODO: Implement activity logging if needed
      
      res.json(checkpoint);
    } catch (error) {
      res.status(500).json({ message: "Erro ao atualizar checkpoint" });
    }
  });

  // TODO: Implement activities feature if needed

  // User management routes
  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      const users = await storage.getUsers();
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

  app.get("/api/pending-users", requireAuth, requireRole(["admin", "gestor"]), async (req, res) => {
    try {
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
      userData.password = await hashPassword(userData.password);

      // Users created by admins/gestores are auto-approved
      userData.approved = true;

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
      res.status(500).json({ message: "Erro ao atualizar usuário", error: error.message });
    }
  });

  app.delete("/api/users/:id", requireAuth, requireRole(["admin", "gestor"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Não permitir deletar a si mesmo
      if (id === req.user?.id) {
        return res.status(400).json({ message: "Não é possível deletar seu próprio usuário" });
      }

      // Verificar se o usuário pode deletar este usuário
      const targetUser = await storage.getUser(id);
      if (!targetUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Gestores só podem deletar usuários operacionais
      if (req.user?.role === "gestor" && targetUser.role !== "operacional") {
        return res.status(403).json({ message: "Sem permissão para deletar este usuário" });
      }

      await storage.deleteUser(id);
      res.json({ message: "Usuário deletado com sucesso" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Erro ao deletar usuário" });
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

  app.patch("/api/users/:id/approve", requireAuth, requireRole(["admin", "gestor"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { subRegionId } = req.body; // Optional sub-region override

      console.log(`Approving user ${id} by ${req.user?.id}, subRegionId: ${subRegionId}`);

      // Verificar se o usuário pode aprovar este usuário
      const targetUser = await storage.getUser(id);
      if (!targetUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Gestores só podem aprovar usuários operacionais
      if (req.user?.role === "gestor" && targetUser.role !== "operacional") {
        return res.status(403).json({ message: "Sem permissão para aprovar este usuário" });
      }

      const user = await storage.approveUser(id, req.user!.id, subRegionId);
      console.log("User approved successfully");
      res.json(user);
    } catch (error) {
      console.error("Error approving user:", error);
      res.status(500).json({ message: "Erro ao aprovar usuário", error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
