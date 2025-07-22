import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  try {
    // Handle old format (just hex hash with hardcoded salt) for backward compatibility
    if (!stored.includes(".")) {
      const suppliedBuf = (await scryptAsync(supplied, 'salt', 64)) as Buffer;
      const storedBuf = Buffer.from(stored, "hex");
      
      // Ensure buffers are the same length for timingSafeEqual
      if (suppliedBuf.length !== storedBuf.length) {
        return false;
      }
      
      return timingSafeEqual(suppliedBuf, storedBuf);
    }
    
    // Handle new format (hash.salt)
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    
    // Ensure buffers are the same length for timingSafeEqual
    if (suppliedBuf.length !== hashedBuf.length) {
      return false;
    }
    
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
}

export function setupAuth(app: Express) {
  const sessionSecret = process.env.SESSION_SECRET || "default-session-secret-change-in-production";
  
  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const user = await storage.getUserByUsername(username);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      }
      
      // Verificar se o usuário está aprovado (exceto admins)
      if (!user.approved && user.role !== 'admin') {
        return done(null, false, { message: "Usuário aguarda aprovação" });
      }
      
      return done(null, user);
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      console.error("Error deserializing user:", error);
      done(error, null);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username já existe" });
      }

      // Validar se gestorId foi fornecido
      if (!req.body.gestorId) {
        return res.status(400).json({ message: "Gestor deve ser selecionado para o registro." });
      }

      // Verificar se o gestor existe e é válido
      const gestor = await storage.getUserById(req.body.gestorId);
      if (!gestor || (gestor.role !== 'gestor' && gestor.role !== 'admin')) {
        return res.status(400).json({ message: "Gestor selecionado inválido." });
      }

      // Public registration sempre cria usuários como operacional, não aprovados, vinculados ao gestor
      const userToCreate = {
        ...req.body,
        role: 'operacional', // Forçar role operacional
        approved: false,     // Aguardar aprovação
        gestorId: req.body.gestorId, // Vincular ao gestor selecionado
        password: await hashPassword(req.body.password)
      };

      const user = await storage.createUser(userToCreate);
      
      // NÃO fazer login automaticamente - usuário deve aguardar aprovação
      res.status(201).json({ 
        message: `Usuário registrado com sucesso! Aguarde aprovação do gestor ${gestor.name}.`,
        userId: user.id 
      });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ message: "Erro ao registrar usuário" });
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}
