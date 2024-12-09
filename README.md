## VERCEL
La parte front del proyecto se ha desplegado en Vercel con el siguiente enlace:
https://trazabilidad-aceite-pfm.vercel.app/

**Repositorio copia para despliegues**
Enlace al repositorio de despliegues de Vercel:
https://github.com/JoakiDev/trazabilidad-aceite-pfm


# Trazabilidad de Aceite - Blockchain dApp

## Descripción del Proyecto
Esta aplicación descentralizada (dApp) permite la trazabilidad completa del aceite de oliva desde su producción hasta el consumidor final, utilizando tecnología blockchain para garantizar la autenticidad y transparencia de la información.

## Arquitectura del Sistema

### Contratos Inteligentes
El sistema utiliza dos contratos principales desplegados en la red Sepolia:

1. **Contrato de Usuarios (`Usuarios.sol`)**
   - Gestiona los roles y permisos de los usuarios (Productor, Fábrica, Minorista, Consumidor)
   - Almacena información de usuarios como nombre, dirección y ubicación GPS
   - Funciones principales:
     - `nuevoUsuario`: Registro de nuevos usuarios con roles específicos
     - `getUsuarios`: Obtención de la lista de usuarios registrados

2. **Contrato de Tokens (`Tokens.sol`)**
   - Gestiona los tokens que representan lotes de aceite
   - Implementa la trazabilidad y transferencias entre actores
   - Funciones principales:
     - Creación de tokens para lotes de aceite
     - Gestión de atributos y características del producto
     - Registro de transferencias y trazabilidad

### Interacción con la Blockchain

#### 1. Autenticación y Roles
- Integración con MetaMask para la autenticación de usuarios
- Verificación automática de roles mediante el contrato de Usuarios
- Sistema de redirección basado en roles a dashboards específicos

#### 2. Gestión de Productos
- **Productores**:
  - Creación de tokens para nuevos lotes de aceite
  - Registro de atributos como temperatura, calidad, etc.
  - Transferencia de lotes a fábricas

- **Fábricas**:
  - Recepción y procesamiento de lotes
  - Creación de nuevos tokens para productos procesados
  - Registro de materias primas utilizadas

- **Minoristas**:
  - Recepción de productos procesados
  - Gestión de inventario
  - Generación de códigos QR para productos

#### 3. Trazabilidad
- Sistema de seguimiento mediante códigos QR únicos
- Cada código QR contiene:
  - ID del token
  - ID de transferencia
  - Timestamp de la transacción
- Historial completo de transferencias y procesamiento
- Visualización de la cadena de custodia en mapa interactivo

#### 4. Verificación de Productos
- Escaneo de códigos QR para acceso a información del producto
- Visualización de:
  - Origen del producto
  - Ruta de procesamiento
  - Certificaciones y atributos
  - Timestamps de cada etapa

## Archivos de Interacción con Blockchain

### Componentes Principales

1. **`src/utils/`**
   - **blockchain.ts**: 
     - Funciones principales de interacción con la blockchain
     - `fetchProductData`: Obtiene datos de productos por ID
     - `getTokenTransfers`: Recupera el historial de transferencias
     - `getReadOnlyProvider`: Proporciona conexión de solo lectura
   - **metamask.ts**:
     - Funciones de interacción con MetaMask
     - Manejo de conexión y firmas
     - Gestión de cuentas de usuario

2. **`src/context/Web3Context.tsx`**
   - Gestión del estado de conexión con Web3
   - Manejo de autenticación con MetaMask
   - Verificación de roles de usuario
   - Hooks personalizados para acceso a blockchain

3. **`src/app/dashboard/[role]/components/`**
   - **ProductorDashboard.tsx**: 
     - Creación y gestión de tokens de aceite
     - Transferencia de lotes a fábricas
     - Interacción con contrato de Tokens
   - **FabricaDashboard.tsx**:
     - Procesamiento de lotes
     - Creación de nuevos tokens procesados
     - Registro de materias primas
   - **MinoristaDashboard.tsx**:
     - Gestión de inventario
     - Generación de códigos QR
     - Transferencias a consumidores

4. **`src/app/product/[id]/page.tsx`**
   - Visualización de información del producto
   - Conexión con contratos para obtener:
     - Datos del token
     - Historial de transferencias
     - Atributos y certificaciones
   - Integración con QR y mapas

5. **`src/components/shared/`**
   - **TransactionMapClient.tsx**: 
     - Visualización de rutas de productos
     - Integración con datos de blockchain para ubicaciones
   - **QRCode.tsx**:
     - Generación de códigos QR con datos de blockchain
     - Formato: TokenID-TransferID-Timestamp

### Archivos de Configuración y Utilidades

1. **`src/constants/contracts.ts`**
   - Direcciones de contratos desplegados
   - ABIs de contratos
   - Configuración de red Sepolia

2. **`src/utils/attributeLabels.ts`**
   - Etiquetas y formatos para atributos de tokens
   - Configuración de unidades y medidas
   - Formateo de datos para visualización

### Flujo de Interacción con Blockchain

1. **Autenticación**:
   - Web3Context gestiona la conexión inicial con MetaMask
   - Verificación de roles mediante contrato de Usuarios
   - Redirección a dashboard específico según rol

2. **Operaciones con Tokens**:
   - Productores crean tokens mediante ProductorDashboard
   - Fábricas procesan y crean nuevos tokens en FabricaDashboard
   - Minoristas gestionan transferencias en MinoristaDashboard

3. **Trazabilidad**:
   - Generación de códigos QR con datos de blockchain
   - Visualización de rutas en mapas interactivos
   - Consulta de historial completo de transferencias

## Tecnologías Utilizadas
- **Frontend**: Next.js, TailwindCSS
- **Blockchain**: Ethereum (Red Sepolia)
- **Contratos**: Solidity
- **Bibliotecas**: ethers.js para interacción con blockchain
- **Mapas**: Leaflet para visualización de rutas
- **QR**: QRCode.react para generación de códigos QR

## Despliegue
La aplicación está desplegada en Vercel y accesible en:
https://trazabilidad-aceite-pfm.vercel.app/

Imagenes:

  Product information:
  <img width="1148" alt="image" src="https://github.com/user-attachments/assets/ed70ca47-a964-4fe4-9fc7-3fde65bbe9e8">

  Quality check (to be implemented)
  <img width="1148" alt="image" src="https://github.com/user-attachments/assets/6aef9532-6039-4866-8a1b-a54bfab77dbc">

  Steps for every participant:
  <img width="1148" alt="image" src="https://github.com/user-attachments/assets/288b084c-6192-4172-8387-622b71ee6435">

  Transfers from the raw matirial, up to the store:
  <img width="1144" alt="image" src="https://github.com/user-attachments/assets/bb98fe60-fb39-4f99-b728-4c14021ba0cd">

