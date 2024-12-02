// Tipos base
export interface Usuario {
  direccion: string;
  nombre: string;
  gps: string;
  rol: string;
  activo: boolean;
}

export interface CondicionesTransporte {
  temperaturaMinima: number;
  temperaturaMaxima: number;
  tipoRefrigeracion: string;
}

export type EstadoTransferencia = 'EN_TRANSITO' | 'COMPLETADA' | 'CANCELADA' | 'VENDIDO';
export type TipoOperacion = 'PRODUCCION' | 'PROCESAMIENTO' | 'DISTRIBUCION' | 'VENTA';

// Tipo para la información del token
export interface TokenInfo {
  id: string;
  nombre: string;
  cantidad: number;
  atributos: Record<string, string | number>;
  tokensOrigen?: string[];
  tokenOrigenACantidad?: Record<string, number>;
}

// Tipos para la vista de timeline
export interface TimelineStep {
  hash: string;
  timestamp: string;
  timestampCompletado?: string;
  participant: {
    name: string;
    role: string;
    address: string;
    coordenadas?: string;
  };
  details: {
    Cantidad: string;
    Estado: EstadoTransferencia;
    coordenadas: string;
    rutaMapaId?: string;
    destinatario?: {
      name: string;
      role: string;
      address: string;
      coordenadas: string;
    };
    Tipo?: string;
  };
  tokenInfo?: TokenInfo;
}

export interface ProductData {
  steps: TimelineStep[];
  batchId: string;
}
