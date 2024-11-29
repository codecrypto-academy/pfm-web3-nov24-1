export interface TokenInfo {
  id: string;
  nombre: string;
  cantidad: number;
  atributos: Record<string, string | number>;
  tokensOrigen?: string[];                              // Array de IDs de tokens origen
  tokenOrigenACantidad?: Record<string, number>;        // Mapping de token ID a cantidad
}

export interface Destinatario {
  name: string;
  role: string;
  address: string;
  coordenadas: string;
}

export interface TimelineStep {
  hash: string;  // Hash de la transacción de envío
  hashCompletado?: string;  // Hash de la transacción de completado/cancelado
  timestamp: string;
  timestampCompletado?: string;
  participant: {
    name: string;
    role: string;
    address: string;
  };
  details: {
    Cantidad: string;
    Estado: string;
    Tipo?: string;
    coordenadas: string;
    destinatario?: Destinatario;
    rutaMapaId?: string;
  };
  tokenInfo?: TokenInfo;
  materiaPrima?: TokenInfo[];
}

export interface ProductData {
  steps: TimelineStep[];
  batchId: string;
}

export interface User {
  direccion: string;
  nombre: string;
  rol: string;
  gps: string;
  activo: boolean;
}
