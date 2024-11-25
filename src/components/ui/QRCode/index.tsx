'use client'

import { QRCodeSVG } from 'qrcode.react';

interface QRCodeProps {
    tokenId: number;
    transferId: number;
    timestamp: number;
    size?: number;
}

const QRCode = ({ tokenId, transferId, timestamp, size = 256 }: QRCodeProps) => {
    // Formato: tokenId-transferId-timestamp
    const qrData = `${tokenId}-${transferId}-${timestamp}`;

    return (
        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg shadow-md">
            <QRCodeSVG
                value={qrData}
                size={size}
                level="H" // Alta corrección de errores
                includeMargin={true}
            />
            <p className="mt-2 text-sm text-gray-600">Token #{tokenId}</p>
            <p className="text-xs text-gray-400">Transfer #{transferId}</p>
        </div>
    );
};

export default QRCode;
