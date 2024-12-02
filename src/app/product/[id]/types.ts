export interface TokenInfo {
  id: string;
  nombre: string;
  cantidad: number;
  atributos: Record<string, string | number>;
}

export interface TimelineStep {
  hash: string;
  timestamp: string;
  timestampCompletado?: string;
  participant: {
    name: string;
    role: string;
    address: string;
  };
  details: Record<string, any>;
  tokenInfo?: TokenInfo;
  materiaPrima?: TokenInfo[];
}

export interface ProductData {
  steps: TimelineStep[];
  batchId: string;
}