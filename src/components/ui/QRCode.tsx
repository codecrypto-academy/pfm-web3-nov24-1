'use client'

import { QRCodeSVG } from 'qrcode.react';

interface QRCodeProps {
    tokenId: number;
    transferId: number | undefined;
    timestamp: number | undefined;
}

const QRCode: React.FC<QRCodeProps> = ({ tokenId, transferId, timestamp }) => {
    // Solo mostrar el QR si tenemos todos los valores necesarios
    if (transferId === undefined || timestamp === undefined) {
        console.log('QR Code values missing:', { tokenId, transferId, timestamp });
        return <div className="text-gray-600">Generando código QR...</div>;
    }

    const qrValue = `${tokenId}-${transferId}-${timestamp}`;
    console.log('Generating QR with value:', qrValue);

    return (
        <div className="flex flex-col items-center">
            <QRCodeSVG
                value={qrValue}
                size={200}
                level="H"
            />
            <div className="mt-4 text-sm text-gray-600">
                <p>Token ID: {tokenId}</p>
                <p>Transfer ID: {transferId}</p>
                <p>Fecha: {new Date(timestamp * 1000).toLocaleString()}</p>
                <div className="mt-2 p-2 bg-gray-100 rounded-lg">
                    <p className="font-medium text-gray-700">Código completo:</p>
                    <p className="font-mono text-sm break-all">{qrValue}</p>
                </div>
            </div>
        </div>
    );
};

export default QRCode;
