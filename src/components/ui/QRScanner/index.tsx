import { Html5QrcodeScanner } from 'html5-qrcode';
import { useEffect, useState } from 'react';

const QRScanner = () => {
    const [scanResult, setScanResult] = useState<string | null>(null);

    useEffect(() => {
        const scanner = new Html5QrcodeScanner(
            "reader",
            {
                qrbox: {
                    width: 250,
                    height: 250,
                },
                fps: 5,
            },
            true  // verbose flag added here
        );

        function success(result: string) {
            scanner.clear();
            setScanResult(result);
        }

        function error(err: string) {
            console.warn(err);
        }

        scanner.render(success, error);

        return () => {
            scanner.clear();
        };
    }, []);

    return (
        <div>
            {scanResult ? (
                <div>Success: {scanResult}</div>
            ) : (
                <div id="reader"></div>
            )}
        </div>
    );
};

export default QRScanner;
