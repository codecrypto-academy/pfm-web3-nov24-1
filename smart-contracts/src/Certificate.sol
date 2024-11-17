// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract OliveOilCertification {
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
        uint256 batchId; // Token ID  COJER DE CREAR TOKENS SC
        address producer; // Ta claro   COJER DE CREAR TOKENS SC
        string variety;         // Variedad de aceituna -- Options  
        string collectionMethod; // Método de recolección -- Options
        uint256 harvestDate;    // Fecha de cosecha-- Time stamp COJER DE CREAR TOKENS SC
        uint256 extractionTemp; // Temperatura de extracción-- Temperatura ambiental en recolección
        uint256 storageTemp;    // Temperatura de almacenamiento -- Temperatura ambiental en almacenamiento en Fabrica
        uint256 acidity;        // Acidez (%) -- Option en fabrica
        uint256 peroxides;      // Peróxidos (meq O2/kg) -- Tocame los huevos
        uint256 polyphenols;    // Polifenoles (mg/kg)-- Tocame los huevos
        uint256 tocopherols;    // Tocoferoles (mg/kg)-- Tocame los huevos
        uint256 organoleptic;   // Puntuación organoléptica (0-10)-- Tocame los huevos
        QualityLevel quality;   // Nivel de calidad -- Nivel dado con los puntos de encima
        bool verified;          // Si ya fue evaluado -- Opción de desactivar ante dudas
    }

    uint256 public nextBatchId; // ID incremental para los lotes (Cada recolecta se crea un nuevo contrato con su ID)
    mapping(uint256 => Batch) public batches;

    // Eventos
    event BatchRegistered(uint256 batchId, address producer); // COJER DE CREAR TOKENS SC
    event QualityEvaluated(uint256 batchId, QualityLevel quality);

    // Registro de un lote por el productor
    function registerBatch(
        string memory variety,
        string memory collectionMethod,
        uint256 harvestDate,
        uint256 extractionTemp,
        uint256 storageTemp,
        uint256 acidity,
        uint256 peroxides,
        uint256 polyphenols,
        uint256 tocopherols,
        uint256 organoleptic
    ) external {
        require(bytes(variety).length > 0, "Variety cannot be empty");
        require(bytes(collectionMethod).length > 0, "Collection method cannot be empty");
        require(harvestDate <= block.timestamp, "Harvest date cannot be in the future");
        require(acidity > 0 && acidity <= 1, "Acidity must be between 0 and 1");
        require(peroxides > 0 && peroxides <= 25, "Peroxides must be <= 25");
        require(extractionTemp >= 15 && extractionTemp <= 30, "Extraction temperature must be between 15 and 30");
        require(storageTemp >= 15 && storageTemp <= 25, "Storage temperature must be between 15 and 25");
        require(organoleptic >= 0 && organoleptic <= 10, "Organoleptic score must be between 0 and 10");

        batches[nextBatchId] = Batch({
            batchId: nextBatchId,
            producer: msg.sender,
            variety: variety,
            collectionMethod: collectionMethod,
            harvestDate: harvestDate,
            extractionTemp: extractionTemp,
            storageTemp: storageTemp,
            acidity: acidity,
            peroxides: peroxides,
            polyphenols: polyphenols,
            tocopherols: tocopherols,
            organoleptic: organoleptic,
            quality: QualityLevel.None,
            verified: false
        });

        emit BatchRegistered(nextBatchId, msg.sender);
        nextBatchId++;
    }

    // Evaluar la calidad de un lote
    function evaluateQuality(uint256 batchId) external {
        Batch storage batch = batches[batchId];
        require(batch.producer != address(0), "Batch does not exist");
        require(!batch.verified, "Batch already evaluated");

        if (
            (batch.acidity * 10) <= (0.3 * 10) &&
            batch.peroxides <= 10 &&
            batch.polyphenols >= 300 &&
            batch.tocopherols >= 250 &&
            batch.extractionTemp <= 20 &&
            batch.storageTemp <= 17 &&
            batch.organoleptic >= 8
        ) {
            batch.quality = QualityLevel.Excellence;
        } else if (
            (batch.acidity * 10) <= (0.4 * 10) &&
            batch.peroxides <= 12 &&
            batch.polyphenols >= 250 &&
            batch.tocopherols >= 200 &&
            batch.extractionTemp <= 23 &&
            batch.storageTemp <= 18
        ) {
            batch.quality = QualityLevel.High;
        } else if (
            (batch.acidity * 10) <= (0.5 * 10) &&
            batch.peroxides <= 15 &&
            batch.polyphenols >= 200 &&
            batch.tocopherols >= 150 &&
            batch.extractionTemp <= 25 &&
            batch.storageTemp <= 20
        ) {
            batch.quality = QualityLevel.Good;
        } else if (
            (batch.acidity * 10) <= (0.6 * 10) &&
            batch.peroxides <= 18 &&
            batch.polyphenols >= 150 &&
            batch.extractionTemp <= 27 &&
            batch.storageTemp <= 22
        ) {
            batch.quality = QualityLevel.Medium;
        } else if (
            (batch.acidity * 10) <= (0.8 * 10) &&
            batch.peroxides <= 20
        ) {
            batch.quality = QualityLevel.Basic;
        } else {
            batch.quality = QualityLevel.None;
        }

        batch.verified = true;
        emit QualityEvaluated(batchId, batch.quality);
    }

    // Consultar detalles de un lote
    function getBatch(uint256 batchId) external view returns (Batch memory) {
        require(batches[batchId].producer != address(0), "Batch does not exist");
        return batches[batchId];
    }
}
