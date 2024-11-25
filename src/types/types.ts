import { ethers } from 'ethers';

export interface Participante {
    direccion: string;
    nombre: string;
    rol: string;
    activo: boolean;
    gps: string;
}

export interface TokenAttribute {
    nombre: string;     // Nombre del atributo
    valor: string;      // Valor del atributo
    timestamp: number;  // Timestamp de cuando se añadió
}

export interface TokenTransfer {
    from: string;
    to: string;
    cantidad: number;
    timestamp: number;
    transactionHash: string;
    blockNumber: number;
}

export interface RelatedToken {
    id: number;
    cantidad: number;
    timestamp: number;
    transactionHash: string;
    blockNumber: number;
    transfers: TokenTransfer[];
    atributos: Record<string, { valor: string }>;  // Ya no es opcional
}

export interface Token {
    id: number;
    nombre: string;
    descripcion: string;
    creador: string;
    cantidad: number;
    timestamp: number;
    isProcesado: boolean;
    tokenPadre?: string;
    atributos: { [key: string]: TokenAttribute };
    nombresAtributos: string[];
    relatedTokens: RelatedToken[];
    transactionHash: string;
    blockNumber: number;
    transfers: TokenTransfer[];
}

// En ethers v6, usamos Result para los args y bigint en lugar de BigNumber
export interface TokenCreadoEvent extends ethers.EventLog {
    args: ethers.Result & {
        id: bigint;
        nombre: string;
        creador: string;
        timestamp: bigint;
    };
}

export interface TokenTransferidoEvent extends ethers.EventLog {
    args: ethers.Result & {
        tokenId: bigint;
        from: string;
        to: string;
        cantidad: bigint;
        timestamp: bigint;
    };
}

export interface Transfer {
    id: number;
    tokenId: number;
    from: string;
    cantidad: number;
    timestamp: number;
    rutaMapaId: string;
    token: Token;
    nombre: string;
    descripcion: string;
    fromGPS?: [number, number];
    toGPS?: [number, number];
}

export interface CreateBatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    token: Token | null;
    onSubmit: (token: Token, quantity: string) => Promise<void>;
    quantity: string;
    setQuantity: (value: string) => void;
    description: string;
    setDescription: (value: string) => void;
    attributes: TokenAttribute[];
    setAttributes: (value: TokenAttribute[]) => void;
}

export interface TransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    token: Token | null;
    onSubmit: () => Promise<void>;
    factories: { direccion: string; nombre: string }[];
    selectedFactory: string;
    setSelectedFactory: (value: string) => void;
    quantity: string;
    setQuantity: (value: string) => void;
    factoryBalance: string;
    onFactorySelect: (tokenId: number, factoryAddress: string) => Promise<void>;
}
