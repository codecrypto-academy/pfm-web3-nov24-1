export interface TokenAttribute {
  nombre: string
  valor: string
  timestamp: number
}

export interface RawMaterial {
  tokenHijo: number
  tokenPadre: number
  cantidadUsada: number
  timestamp: number
}

export enum EstadoTransferencia {
  EN_TRANSITO,
  COMPLETADA,
  CANCELADA
}

export interface DetailedTransaction {
  // Datos básicos
  id: string
  tokenId: number
  transferId: number
  blockNumber: number
  gasUsed: string
  gasPrice: string
  timestamp: number
  estado: EstadoTransferencia

  // Datos del producto
  product: string
  description: string
  quantity: number
  attributes: TokenAttribute[]
  rawMaterials: RawMaterial[]

  // Ubicaciones
  fromLocation: [number, number] | null
  toLocation: [number, number] | null

  // Datos de participantes
  from: {
    address: string
    name: string
    role: string
    gps: string
    active: boolean
  }
  to: {
    address: string
    name: string
    role: string
    gps: string
    active: boolean
  }
}
