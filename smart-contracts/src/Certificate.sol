// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Tokens.sol";

contract OliveOilCertification {
    Tokens public tokensContract;

    // Enum para los niveles de calidad
    enum QualityLevel {
        None,        // Sin certificación
        Basic,       // Nivel 1: Calidad Básica
        Medium,      // Nivel 2: Calidad Media
        Good,        // Nivel 3: Buena Calidad
        High,        // Nivel 4: Alta Calidad
        Excellence   // Nivel 5: Certificado de Excelencia
    }

    // Estructura para representar un lote
    struct Batch {
        uint256 tokenId;           // ID del token asociado
        address producer;          // Productor (del token)
        QualityLevel quality;      // Nivel de calidad calculado
        bool verified;             // Si ya fue evaluado
    }

    mapping(uint256 => Batch) public batches;

    // Eventos
    event QualityEvaluated(uint256 tokenId, QualityLevel quality);

    constructor(address _tokensContract) {
        tokensContract = Tokens(_tokensContract);
    }

    // Evaluar la calidad de un token/lote
    function evaluateQuality(uint256 _tokenId) external {
        // Verificar que el token existe y obtener sus datos
        (string memory variety,) = tokensContract.getAtributo(_tokenId, "variedad");
        (string memory collectionMethod,) = tokensContract.getAtributo(_tokenId, "metodoRecoleccion");
        (string memory acidityStr,) = tokensContract.getAtributo(_tokenId, "acidez");
        (string memory peroxidesStr,) = tokensContract.getAtributo(_tokenId, "peroxidos");
        (string memory polyphenolsStr,) = tokensContract.getAtributo(_tokenId, "polifenoles");
        (string memory tocopherolsStr,) = tokensContract.getAtributo(_tokenId, "tocoferoles");
        (string memory organolepticStr,) = tokensContract.getAtributo(_tokenId, "organoleptico");
        
        // Convertir strings a números
        uint256 acidity = stringToUint(acidityStr);
        uint256 peroxides = stringToUint(peroxidesStr);
        uint256 polyphenols = stringToUint(polyphenolsStr);
        uint256 tocopherols = stringToUint(tocopherolsStr);
        uint256 organoleptic = stringToUint(organolepticStr);

        // Obtener temperaturas del último transporte
        (,,,,,CondicionesTransporte memory conditions) = tokensContract.getLastTransfer(_tokenId);
        int256 storageTemp = conditions.temperaturaMaxima;

        require(!batches[_tokenId].verified, "Batch already evaluated");

        // Evaluar calidad basada en los parámetros
        QualityLevel quality;

        if (
            acidity <= 3 && // 0.3%
            peroxides <= 10 &&
            polyphenols >= 300 &&
            tocopherols >= 250 &&
            storageTemp <= 17 &&
            organoleptic >= 8
        ) {
            quality = QualityLevel.Excellence;
        } else if (
            acidity <= 4 && // 0.4%
            peroxides <= 12 &&
            polyphenols >= 250 &&
            tocopherols >= 200 &&
            storageTemp <= 18
        ) {
            quality = QualityLevel.High;
        } else if (
            acidity <= 5 && // 0.5%
            peroxides <= 15 &&
            polyphenols >= 200 &&
            tocopherols >= 150 &&
            storageTemp <= 20
        ) {
            quality = QualityLevel.Good;
        } else if (
            acidity <= 6 && // 0.6%
            peroxides <= 18 &&
            polyphenols >= 150 &&
            storageTemp <= 22
        ) {
            quality = QualityLevel.Medium;
        } else if (
            acidity <= 8 && // 0.8%
            peroxides <= 20
        ) {
            quality = QualityLevel.Basic;
        } else {
            quality = QualityLevel.None;
        }

        // Guardar el resultado
        batches[_tokenId] = Batch({
            tokenId: _tokenId,
            producer: tokensContract.getTokenCreator(_tokenId),
            quality: quality,
            verified: true
        });

        emit QualityEvaluated(_tokenId, quality);
    }

    // Consultar certificación de un token/lote
    function getBatchCertification(uint256 _tokenId) external view returns (
        address producer,
        QualityLevel quality,
        bool verified,
        string memory varietyName,
        string memory collectionMethod,
        uint256 timestamp,
        int256 storageTemp
    ) {
        Batch memory batch = batches[_tokenId];
        require(batch.verified, "Batch not evaluated yet");

        // Obtener datos adicionales del token
        (string memory variety,) = tokensContract.getAtributo(_tokenId, "variedad");
        (string memory method,) = tokensContract.getAtributo(_tokenId, "metodoRecoleccion");
        (,,,,,CondicionesTransporte memory conditions) = tokensContract.getLastTransfer(_tokenId);

        return (
            batch.producer,
            batch.quality,
            batch.verified,
            variety,
            method,
            tokensContract.getTokenTimestamp(_tokenId),
            conditions.temperaturaMaxima
        );
    }

    // Función auxiliar para convertir string a uint
    function stringToUint(string memory s) internal pure returns (uint256) {
        bytes memory b = bytes(s);
        uint256 result = 0;
        for(uint i = 0; i < b.length; i++) {
            uint8 c = uint8(b[i]);
            if (c >= 48 && c <= 57) {
                result = result * 10 + (c - 48);
            }
        }
        return result;
    }
}