import { Router } from "express";
import multer from "multer";
import ExcelJS from "exceljs";
import { storage } from "../../storage";
import { asyncHandler } from "../../middleware/async-handler";
import { requireAuth, requireRole } from "../../middleware/auth";
import { ValidationError } from "../../errors/app-error";
import { cached } from "../../cache";
import { convertBRToDatabase } from "../../formatters";

export const adminImportRouter: Router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Tipo de arquivo inválido. Apenas arquivos Excel são permitidos."));
    }
  },
});

const rowToArray = (row: ExcelJS.Row): unknown[] => {
  const values = row.values as unknown[];
  if (!Array.isArray(values)) return [];
  return values.slice(1);
};

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

adminImportRouter.use(requireAuth, requireRole(["admin"]));

adminImportRouter.get(
  "/export-template",
  asyncHandler(async (_req, res) => {
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
      [
        "titulo",
        "descricao",
        "data_vencimento",
        "prioridade",
        "status",
        "resultado_chave_id",
        "responsavel_id",
      ],
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
    res.send(Buffer.from(buffer as ArrayBuffer));
  })
);

adminImportRouter.post(
  "/import-data",
  upload.single("file"),
  asyncHandler(async (req: any, res) => {
    if (!req.file) throw new ValidationError("Nenhum arquivo fornecido");

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    let imported = 0;
    const errors: string[] = [];

    const objectivesSheet = workbook.getWorksheet("Objetivos");
    if (objectivesSheet) {
      const lastRow = objectivesSheet.actualRowCount;
      for (let i = 2; i <= lastRow; i++) {
        const row = rowToArray(objectivesSheet.getRow(i));
        const title = cellToString(row[0]);
        if (title) {
          try {
            await storage.createObjective({
              title,
              description: cellToString(row[1]),
              startDate: cellToString(row[2]),
              endDate: cellToString(row[3]),
              status: cellToString(row[4]) || "active",
              regionId: parseInt(cellToString(row[5])) || null,
              ownerId: parseInt(cellToString(row[6])) || req.user!.id,
            } as any);
            imported++;
          } catch (error) {
            errors.push(`Erro ao importar objetivo ${title}: ${error}`);
          }
        }
      }
    }

    const krSheet = workbook.getWorksheet("Resultados-Chave");
    if (krSheet) {
      const lastRow = krSheet.actualRowCount;
      for (let i = 2; i <= lastRow; i++) {
        const row = rowToArray(krSheet.getRow(i));
        const title = cellToString(row[0]);
        const objectiveIdStr = cellToString(row[7]);
        if (title && objectiveIdStr) {
          try {
            await storage.createKeyResult({
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
            } as any);
            imported++;
          } catch (error) {
            errors.push(`Erro ao importar resultado-chave ${title}: ${error}`);
          }
        }
      }
    }

    const actionsSheet = workbook.getWorksheet("Ações");
    if (actionsSheet) {
      const lastRow = actionsSheet.actualRowCount;
      for (let i = 2; i <= lastRow; i++) {
        const row = rowToArray(actionsSheet.getRow(i));
        const title = cellToString(row[0]);
        const krIdStr = cellToString(row[5]);
        if (title && krIdStr) {
          try {
            await storage.createAction({
              title,
              description: cellToString(row[1]),
              dueDate: cellToString(row[2]),
              priority: cellToString(row[3]) || "medium",
              status: cellToString(row[4]) || "pending",
              keyResultId: parseInt(krIdStr),
              responsibleId: parseInt(cellToString(row[6])) || req.user!.id,
            } as any);
            imported++;
          } catch (error) {
            errors.push(`Erro ao importar ação ${title}: ${error}`);
          }
        }
      }
    }

    res.json({
      message: "Dados importados com sucesso",
      imported,
      errors: errors.length > 0 ? errors : undefined,
    });
  })
);
