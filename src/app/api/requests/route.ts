import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const dataFilePath = path.join(process.cwd(), 'data', 'requests.json')

async function ensureDataDirectory() {
    const dataDir = path.dirname(dataFilePath)
    try {
        await fs.access(dataDir)
    } catch {
        await fs.mkdir(dataDir, { recursive: true })
    }
}

async function initializeRequestsFile() {
    try {
        await fs.access(dataFilePath)
        console.log('Requests file exists')
    } catch {
        console.log('Creating new requests file')
        await ensureDataDirectory()
        await fs.writeFile(dataFilePath, '[]', 'utf8')
    }
}

export async function GET() {
    console.log('GET /api/requests - Start')
    try {
        // Asegurar que el archivo existe
        await initializeRequestsFile()

        // Leer el archivo
        console.log('Reading requests file:', dataFilePath)
        let jsonData: string;
        try {
            jsonData = await fs.readFile(dataFilePath, 'utf8')
        } catch (readError) {
            console.error('Error reading file:', readError)
            // Reinicializar el archivo si hay error de lectura
            await fs.writeFile(dataFilePath, '[]', 'utf8')
            return NextResponse.json([])
        }
        
        console.log('File contents:', jsonData)
        
        // Si el archivo está vacío o solo contiene espacios en blanco
        if (!jsonData.trim()) {
            console.log('Empty file, returning empty array')
            return NextResponse.json([])
        }

        // Intentar parsear el JSON
        try {
            const requests = JSON.parse(jsonData)
            if (!Array.isArray(requests)) {
                console.log('Invalid JSON structure (not an array), resetting file')
                await fs.writeFile(dataFilePath, '[]', 'utf8')
                return NextResponse.json([])
            }
            console.log('Successfully parsed requests:', requests)
            return NextResponse.json(requests)
        } catch (parseError) {
            console.error('Error parsing JSON:', parseError)
            // Si el JSON no es válido, reiniciar el archivo
            await fs.writeFile(dataFilePath, '[]', 'utf8')
            return NextResponse.json([])
        }
    } catch (error) {
        console.error('Error in GET /api/requests:', error)
        // Ser más específico con el mensaje de error
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        return new NextResponse(
            JSON.stringify({ error: 'Error reading requests', details: errorMessage }),
            { 
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        )
    }
}

export async function POST(request: Request) {
    console.log('POST /api/requests - Start')
    try {
        const data = await request.json()
        console.log('Received data:', data)

        // Asegurar que el archivo existe
        await initializeRequestsFile()

        if (data.status === 'approved') {
            console.log('Processing approval for request:', data.id)
            // Leer solicitudes actuales
            const jsonData = await fs.readFile(dataFilePath, 'utf8')
            let requests = JSON.parse(jsonData)

            // Filtrar la solicitud aprobada
            const originalLength = requests.length
            requests = requests.filter((req: any) => req.id !== data.id)
            console.log(`Filtered requests: removed ${originalLength - requests.length} items`)

            // Guardar las solicitudes actualizadas
            await fs.writeFile(dataFilePath, JSON.stringify(requests, null, 2), 'utf8')
            console.log('Updated requests file after approval')

            return NextResponse.json({ message: 'Request removed successfully' })
        }

        // Manejar nueva solicitud
        console.log('Processing new request')
        let requests = []
        try {
            const jsonData = await fs.readFile(dataFilePath, 'utf8')
            requests = JSON.parse(jsonData)
            if (!Array.isArray(requests)) {
                console.log('Invalid JSON structure in file, resetting to empty array')
                requests = []
            }
        } catch (error) {
            console.error('Error reading existing requests:', error)
            await ensureDataDirectory()
        }

        // Agregar nueva solicitud
        const newRequest = {
            ...data,
            id: Date.now(),
            status: 'pending',
            timestamp: new Date().toISOString()
        }
        requests.push(newRequest)
        console.log('Added new request:', newRequest)

        // Guardar solicitudes actualizadas
        await fs.writeFile(dataFilePath, JSON.stringify(requests, null, 2), 'utf8')
        console.log('Successfully saved new request')

        return NextResponse.json({ 
            message: 'Request saved successfully',
            request: newRequest
        })
    } catch (error) {
        console.error('Error in POST /api/requests:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        return NextResponse.json(
            { error: 'Error processing request', details: errorMessage },
            { status: 500 }
        )
    }
}
