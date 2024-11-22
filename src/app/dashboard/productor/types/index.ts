import { EventLog } from 'ethers'

export interface TokenAttribute {
    nombre: string;     // Nombre del atributo
    valor: string;      // Valor del atributo
    timestamp: number;  // Timestamp de cuando se añadió
}

export interface RelatedToken {
    id: number;
    cantidad: number;
    timestamp: number;
}

export interface Token {
    id: number;
    nombre: string;
    descripcion?: string;
    creador: string;
    cantidad: number;
    timestamp: number;
    isProcesado?: boolean;
    tokenPadre?: string;
    atributos: { [key: string]: TokenAttribute };  // Cambiado a un objeto para reflejar el mapping
    nombresAtributos: string[];                    // Array para iterar sobre los atributos
    relatedTokens: RelatedToken[];
}

// Definir la interfaz para los argumentos del evento
export interface TransferEventArgs {
    tokenId: bigint;
    from: string;
    to: string;
    cantidad: bigint;
}

export interface TokenTransferidoEvent extends Omit<EventLog, 'args'> {
    args: TransferEventArgs;
}

export interface CreatedEventArgs {
    id: bigint;
    nombre: string;
    creador: string;
    cantidad: bigint;
}

export interface TokenCreadoEvent extends Omit<EventLog, 'args'> {
    args: CreatedEventArgs;
}

// Props para los modales
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
