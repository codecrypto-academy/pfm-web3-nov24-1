export interface Participante {
    direccion: string;
    nombre: string;
    rol: string;
    activo: boolean;
    gps: string;
}

export interface Transfer {
    id: number;
    tokenId: number;
    from: string;
    cantidad: number;
    timestamp: number;
    rutaMapaId: string;
    token: {
        nombre: string;
        descripcion: string;
    };
    nombre: string;
    descripcion: string;
    fromGPS?: [number, number];
    toGPS?: [number, number];
}
