// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Tokens.sol";

interface ITokens {
    struct CondicionesTransporte {
        int256 temperaturaMinima;
        int256 temperaturaMaxima;
        string tipoRefrigeracion;
    }

    function getLastTransfer(uint256 _tokenId) external view returns (
        address from,
        address to,
        address transportista,
        uint256 cantidad,
        uint256 timestamp,
        CondicionesTransporte memory conditions
    );

    function getAtributo(uint256 _tokenId, string memory _nombreAtributo) 
        external view returns (string memory nombre, string memory valor, uint256 timestamp);

    function tokens(uint256 _tokenId) external view returns (
        uint256 id,
        string memory nombre,
        address creador,
        string memory descripcion,
        uint256 cantidad,
        uint256 timestamp
    );
}

/*	•	Responsable de:
	•	Registrar el proceso de extracción del aceite.
	•	Parámetros que debe registrar:
	•	Método de extracción:
	•	Extracción en frío (Máximo 27°C, mejor calidad).
	•	Extracción en caliente (Mayor temperatura, menor calidad).
	•	Tiempo desde la cosecha hasta la extracción:
	•	Menor de 24 horas: Excelente.
	•	Entre 24-48 horas: Bueno.
	•	Más de 48 horas: Regular.
	•	Cantidad de aceite extraído por tonelada:
	•	Indicador de eficiencia y madurez de las aceitunas.
	•	Datos que registra la almazara en el contrato inteligente:
*/
contract OliveOilCertification {
    Tokens public tokensContract;
    ITokens private tokensInterface;

    enum QualityLevel {
        None,
        Basic,
        Medium,
        Good,
        High,
        Excellence
    }

    struct Batch {
        uint256 tokenId;
        address producer;
        QualityLevel quality;
        bool verified;
    }

    struct QualityParams {
        uint256 acidity;
        uint256 peroxides;
        uint256 polyphenols;
        uint256 tocopherols;
        uint256 organoleptic;
        int256 storageTemp;
    }

    mapping(uint256 => Batch) public batches;

    event QualityEvaluated(uint256 tokenId, QualityLevel quality);

    constructor(address _tokensContract) {
        tokensContract = Tokens(_tokensContract);
        tokensInterface = ITokens(_tokensContract);
    }

    function getQualityParams(uint256 _tokenId) internal view returns (QualityParams memory) {
        (string memory acidityStr, ,) = tokensInterface.getAtributo(_tokenId, "acidez");
        (string memory peroxidesStr, ,) = tokensInterface.getAtributo(_tokenId, "peroxidos");
        (string memory polyphenolsStr, ,) = tokensInterface.getAtributo(_tokenId, "polifenoles");
        (string memory tocopherolsStr, ,) = tokensInterface.getAtributo(_tokenId, "tocoferoles");
        (string memory organolepticStr, ,) = tokensInterface.getAtributo(_tokenId, "organoleptico");
        
        (,,,,,ITokens.CondicionesTransporte memory conditions) = tokensInterface.getLastTransfer(_tokenId);

        return QualityParams({
            acidity: stringToUint(acidityStr),
            peroxides: stringToUint(peroxidesStr),
            polyphenols: stringToUint(polyphenolsStr),
            tocopherols: stringToUint(tocopherolsStr),
            organoleptic: stringToUint(organolepticStr),
            storageTemp: conditions.temperaturaMaxima
        });
    }

    function calculateQuality(QualityParams memory params) internal pure returns (QualityLevel) {
        if (
            params.acidity <= 3 &&
            params.peroxides <= 10 &&
            params.polyphenols >= 300 &&
            params.tocopherols >= 250 &&
            params.storageTemp <= 17 &&
            params.organoleptic >= 8
        ) {
            return QualityLevel.Excellence;
        } else if (
            params.acidity <= 4 &&
            params.peroxides <= 12 &&
            params.polyphenols >= 250 &&
            params.tocopherols >= 200 &&
            params.storageTemp <= 18
        ) {
            return QualityLevel.High;
        } else if (
            params.acidity <= 5 &&
            params.peroxides <= 15 &&
            params.polyphenols >= 200 &&
            params.tocopherols >= 150 &&
            params.storageTemp <= 20
        ) {
            return QualityLevel.Good;
        } else if (
            params.acidity <= 6 &&
            params.peroxides <= 18 &&
            params.polyphenols >= 150 &&
            params.storageTemp <= 22
        ) {
            return QualityLevel.Medium;
        } else if (
            params.acidity <= 8 &&
            params.peroxides <= 20
        ) {
            return QualityLevel.Basic;
        } else {
            return QualityLevel.None;
        }
    }

    function evaluateQuality(uint256 _tokenId) external {
        require(!batches[_tokenId].verified, "Batch already evaluated");
        
        (, , address creator, , ,) = tokensInterface.tokens(_tokenId);
        QualityParams memory params = getQualityParams(_tokenId);
        QualityLevel quality = calculateQuality(params);

        batches[_tokenId] = Batch({
            tokenId: _tokenId,
            producer: creator,
            quality: quality,
            verified: true
        });

        emit QualityEvaluated(_tokenId, quality);
    }

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

        (string memory variety, ,) = tokensInterface.getAtributo(_tokenId, "variedad");
        (string memory method, ,) = tokensInterface.getAtributo(_tokenId, "metodoRecoleccion");
        (, , , , uint256 tokenTimestamp,) = tokensInterface.tokens(_tokenId);
        (,,,,,ITokens.CondicionesTransporte memory conditions) = tokensInterface.getLastTransfer(_tokenId);

        return (
            batch.producer,
            batch.quality,
            batch.verified,
            variety,
            method,
            tokenTimestamp,
            conditions.temperaturaMaxima
        );
    }

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