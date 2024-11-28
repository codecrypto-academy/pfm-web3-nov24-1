export interface TokenInfo {
  id: string;
  nombre: string;
  cantidad: number;
  atributos: Record<string, string | number>;
}

export interface Destinatario {
  name: string;
  role: string;
  address: string;
  coordenadas: string;
}

export interface TimelineStep {
  hash: string;
  timestamp: string;
  participant: {
    name: string;
    role: string;
    address: string;
  };
  details: {
    Cantidad: string;
    Estado: string;
    coordenadas: string;
    destinatario?: Destinatario;
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
