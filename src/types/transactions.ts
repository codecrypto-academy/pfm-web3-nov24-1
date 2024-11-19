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

export interface DetailedTransaction {
  // Datos básicos
  id: string
  tokenId: number
  blockNumber: number
  gasUsed: string
  gasPrice: string
  timestamp: number

  // Datos del producto
  product: string
  description: string
  quantity: number
  attributes: TokenAttribute[]
  rawMaterials: RawMaterial[]

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

  // Ubicaciones
  fromLocation: [number, number]
  toLocation: [number, number]
}
