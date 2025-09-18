// Models and types mirroring the Python MCP server

export type Identifier = string;

export interface Version {
  /** Version identifier for the SDK. */
  name: string;
}

export interface Field {
  /** Struct type of the field. Use 'describe_struct' tool to get type information. */
  type: string;
  /** Whether the field is required. */
  required?: boolean;
  /** Description of what the field represents. */
  description?: string;
}

export interface Struct {
  /** Unique identifier for the struct. */
  id: string;
  /** Name of the struct. */
  name: string;
  /** Description of what the struct represents. */
  description?: string;
  /**
   * Struct fields. Use 'describe_struct' tool to get parameter type information.
   */
  fields?: Record<string, Field>;
  /** Required imports to use the struct. */
  imports?: string[];
  /**
   * Link to files related to the struct that can be used as reference.
   */
  files?: string[];
  /**
   * Code snippet demonstrating struct declaration and/or instantiation. Use 'describe_struct' tool to get type information on structs referenced in the example.
   */
  example?: string;
  /** Tags related to the function. */
  tags?: Set<string>;
}

export interface FunctionDef {
  /** Unique identifier for the function. */
  id: string;
  /** Name of the function. */
  name: string;
  /** Description of what the function does. */
  description?: string;
  /**
   * Struct containing the function. Use 'describe_struct' tool to get struct type information.
   */
  struct?: string;
  /**
   * Function parameters. Use 'describe_struct' tool to get parameter type information.
   */
  parameters?: Record<string, Field>;
  /**
   * Function return type. Use 'describe_struct' tool to get return type information.
   */
  return_type?: string;
  /** Required imports to use the function. */
  imports?: string[];
  /**
   * Link to files related to the function that can be used as reference.
   */
  files?: string[];
  /**
   * Code snippet demonstrating function usage. Use 'describe_struct' tool to get type information on structs referenced in the example.
   */
  example?: string;
  /** Tags related to the function. */
  tags?: Set<string>;
}

export interface Paginated<T> {
  /** List of items matching the search criteria. */
  data: T[];
  /** Total number of items matching the search criteria. */
  total: number;
  /**
   * Offset for the next page of results, or null if this is the last page.
   */
  next?: number;
}

export type Config = {
  version?: Version;
  structs: Record<string, Struct>;
  functions: Record<string, FunctionDef>;
};


