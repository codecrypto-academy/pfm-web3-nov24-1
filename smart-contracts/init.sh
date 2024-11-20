#!/bin/bash

# Limpiar compilación anterior
forge clean

# Compilar contratos
forge build

# Matar cualquier instancia previa de anvil
pkill anvil

# Iniciar anvil en segundo plano
anvil &

# Esperar a que anvil esté listo
sleep 2

# Desplegar los contratos y crear datos iniciales
forge script script/Setup.s.sol --broadcast --fork-url http://localhost:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 > deployment.log 2>&1

# Actualizar el archivo contracts.ts usando el script de Node.js
node update-contracts.js

echo "Setup completado. Contratos desplegados y archivo contracts.ts actualizado."
