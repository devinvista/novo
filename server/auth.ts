import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { env, isProd } from "./config/env";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(
  supplied: string,
  stored: string
): Promise<{ ok: boolean; legacy: boolean }> {
  try {
    // Legacy format (just hex hash with hardcoded salt) — accepted only to allow
    // transparent migration to the new format on first successful login.
    if (!stored.includes(".")) {
      const suppliedBuf = (await scryptAsync(supplied, "salt", 32)) as Buffer;
      const storedBuf = Buffer.from(stored, "hex");
      if (suppliedBuf.length !== storedBuf.length) return { ok: false, legacy: true };
      return { ok: timingSafeEqual(suppliedBuf, storedBuf), legacy: true };
    }

    // New format (hash.salt)
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    if (suppliedBuf.length !== hashedBuf.length) return { ok: false, legacy: false };
    return { ok: timingSafeEqual(hashedBuf, suppliedBuf), legacy: false };
  } catch (error) {
    console.error("Password comparison error:", error);
    return { ok: false, legacy: false };
  }
}

export function setupAuth(app: Express) {
  // env validation already guarantees SESSION_SECRET is set in production.
  const sessionSecret =
    env.SESSION_SECRET || "dev-only-session-secret-do-not-use-in-production";

  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        
        if (!user) {
          return done(null, false);
        }
        
        const { ok, legacy } = await comparePasswords(password, user.password);

        if (!ok) {
          return done(null, false);
        }

        // Verificar se o usuário está aprovado (exceto admins)
        if (!user.approved && user.role !== 'admin') {
          return done(null, false, { message: "Usuário aguarda aprovação do gestor" });
        }

        // Auto-upgrade legacy password hashes to the new salted format on successful login.
        if (legacy) {
          try {
            const newHash = await hashPassword(password);
            await storage.updateUser(user.id, { password: newHash });
          } catch (e) {
            console.error("Failed to upgrade legacy password hash:", e);
          }
        }

        return done(null, user);
      } catch (error) {
        console.error('Login error:', error);
        return done(error);
      }
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
        return res.status(400).json({ message: "Nome de usuário já existe" });
      }

      // Validar se gestorId foi fornecido
      if (!req.body.gestorId) {
        return res.status(400).json({ message: "Gestor deve ser selecionado para o registro." });
      }

      // Parse gestorId to number and validate
      const gestorId = parseInt(req.body.gestorId);
      if (isNaN(gestorId)) {
        return res.status(400).json({ message: "ID do gestor inválido." });
      }

      // Verificar se o gestor existe e é válido
      const gestor = await storage.getUserById(gestorId);
      if (!gestor || (gestor.role !== 'gestor' && gestor.role !== 'admin')) {
        return res.status(400).json({ message: "Gestor selecionado inválido." });
      }

      // Public registration sempre cria usuários como operacional, não aprovados, vinculados ao gestor
      const userToCreate = {
        ...req.body,
        role: 'operacional', // Forçar role operacional
        approved: false,     // Aguardar aprovação
        gestorId: gestorId, // Vincular ao gestor selecionado (número)
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
    const { password, ...safeUser } = req.user as any;
    res.status(200).json(safeUser);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { password, ...safeUser } = req.user as any;
    res.json(safeUser);
  });
}
