import { Motorista, FuncaoMotorista, SetorMotorista } from '@/types';

export interface ParsedUnidade {
  id: number;
  nome: string;
  codigo?: string;
}

export interface ParsedMotorista {
  id: number;
  nome: string;
  codigo: string;
  data_nascimento?: string;
  unidade_id: number;
  funcao: string;
  setor: string;
  whatsapp?: string;
  email?: string;
  senha?: string;
}

export interface ParsedProduto {
  codigo: string;
  nome: string;
  embalagem: string;
}

export interface ParseResult {
  unidades: ParsedUnidade[];
  motoristas: ParsedMotorista[];
  produtos: ParsedProduto[];
  errors: string[];
}

function extractInsertValues(sql: string, tableName: string): string[][] {
  const regex = new RegExp(
    `INSERT INTO \`?${tableName}\`?\\s*(?:\\([^)]+\\))?\\s*VALUES\\s*([\\s\\S]*?)(?:;|$)`,
    'gi'
  );
  
  const results: string[][] = [];
  let match;
  
  while ((match = regex.exec(sql)) !== null) {
    const valuesSection = match[1];
    // Parse each row of values
    const rowRegex = /\(([^)]+)\)/g;
    let rowMatch;
    
    while ((rowMatch = rowRegex.exec(valuesSection)) !== null) {
      const values = parseValueRow(rowMatch[1]);
      results.push(values);
    }
  }
  
  return results;
}

function parseValueRow(row: string): string[] {
  const values: string[] = [];
  let current = '';
  let inString = false;
  let stringChar = '';
  let escaped = false;
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    
    if (char === '\\') {
      escaped = true;
      continue;
    }
    
    if (!inString && (char === "'" || char === '"')) {
      inString = true;
      stringChar = char;
      continue;
    }
    
    if (inString && char === stringChar) {
      inString = false;
      continue;
    }
    
    if (!inString && char === ',') {
      values.push(current.trim());
      current = '';
      continue;
    }
    
    current += char;
  }
  
  if (current.trim()) {
    values.push(current.trim());
  }
  
  return values.map(v => v === 'NULL' ? '' : v);
}

export function parseSqlFile(sqlContent: string): ParseResult {
  const result: ParseResult = {
    unidades: [],
    motoristas: [],
    produtos: [],
    errors: [],
  };
  
  try {
    // Parse unidades
    const unidadeRows = extractInsertValues(sqlContent, 'unidades');
    result.unidades = unidadeRows.map((row) => ({
      id: parseInt(row[0]) || 0,
      nome: row[1] || '',
      codigo: row[2] || row[1]?.substring(0, 3).toUpperCase() || '',
    }));
    
    // Parse motoristas
    const motoristaRows = extractInsertValues(sqlContent, 'motorista');
    result.motoristas = motoristaRows.map((row) => ({
      id: parseInt(row[0]) || 0,
      nome: row[1] || '',
      codigo: row[2] || '',
      data_nascimento: row[3] || '',
      unidade_id: parseInt(row[4]) || 0,
      funcao: row[5] || 'motorista',
      setor: row[6] || 'sede',
      whatsapp: row[7] || '',
      email: row[8] || '',
      senha: row[9] || '',
    }));
    
    // Parse produtos
    const produtoRows = extractInsertValues(sqlContent, 'produtos');
    result.produtos = produtoRows.map((row) => ({
      codigo: row[1] || row[0] || '',
      nome: row[2] || row[1] || '',
      embalagem: row[3] || 'UN',
    }));
    
  } catch (error) {
    result.errors.push(`Erro ao fazer parse do SQL: ${error}`);
  }
  
  return result;
}

export function mapParsedToMotorista(
  parsed: ParsedMotorista,
  unidadesMap: Map<number, string>
): Omit<Motorista, 'id' | 'createdAt'> {
  const funcaoMap: Record<string, FuncaoMotorista> = {
    'motorista': 'motorista',
    'ajudante': 'ajudante_entrega',
    'ajudante_entrega': 'ajudante_entrega',
  };
  
  const setorMap: Record<string, SetorMotorista> = {
    'interior': 'interior',
    'sede': 'sede',
  };
  
  return {
    nome: parsed.nome,
    codigo: parsed.codigo,
    dataNascimento: parsed.data_nascimento || '',
    unidade: unidadesMap.get(parsed.unidade_id) || 'Não definida',
    funcao: funcaoMap[parsed.funcao?.toLowerCase()] || 'motorista',
    setor: setorMap[parsed.setor?.toLowerCase()] || 'sede',
    whatsapp: parsed.whatsapp || '',
    email: parsed.email || '',
    senha: parsed.senha || '',
  };
}
