import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { resolve, join } from "path";
import yaml from "js-yaml";
import { Config as ConfigType, Struct, FunctionDef } from "./types.js";
import { getLogger } from "./logger.js";

const logger = getLogger();

export function loadConfigFromDir(dirPath: string): ConfigType {
  const resolvedDir = resolve(dirPath);
  logger.info({ dir: resolvedDir }, "Loading configurations from directory");
  const combined: ConfigType = { structs: {}, functions: {} };
  let filesProcessed = 0;

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) {
        walk(full);
      } else if (entry.endsWith(".yaml") || entry.endsWith(".yml")) {
        const data = yaml.load(readFileSync(full, "utf-8")) as Partial<ConfigType> | null;
        const config = normalizeConfig(data ?? {});
        if (config.version) {
          if ((combined as any).version) throw new Error(`duplicate 'version' in ${full}`);
          (combined as any).version = config.version;
        }
        for (const [k, v] of Object.entries(config.structs)) {
          if (combined.structs[k]) throw new Error(`duplicate struct id '${k}' in ${full}`);
          combined.structs[k] = v;
        }
        for (const [k, v] of Object.entries(config.functions)) {
          if (combined.functions[k]) throw new Error(`duplicate function id '${k}' in ${full}`);
          combined.functions[k] = v;
        }
        filesProcessed++;
      }
    }
  };
  walk(resolvedDir);

  logger.info({ filesProcessed, models: Object.keys(combined.structs).length, functions: Object.keys(combined.functions).length }, "Directory configurations loaded");
  return combined;
}

function normalizeConfig(input: Partial<ConfigType>): ConfigType {
  const structs: Record<string, Struct> = {};
  const functions: Record<string, FunctionDef> = {};
  const inStructs = input.structs ?? {};
  const inFunctions = input.functions ?? {};

  for (const [id, s] of Object.entries(inStructs)) {
    const tags = s.tags instanceof Set ? s.tags : Array.isArray(s.tags) ? new Set(s.tags) : undefined;
    structs[id] = { ...s, id, tags } as Struct;
  }
  for (const [id, f] of Object.entries(inFunctions)) {
    const tags = f.tags instanceof Set ? f.tags : Array.isArray(f.tags) ? new Set(f.tags) : undefined;
    functions[id] = { ...f, id, tags } as FunctionDef;
  }

  const config: ConfigType = {
    version: input.version,
    structs,
    functions,
  };
  return config;
}


