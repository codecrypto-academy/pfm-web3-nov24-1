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
    } catch {
        await ensureDataDirectory()
        await fs.writeFile(dataFilePath, '[]', 'utf8')
    }
}

export async function GET() {
    try {
        await initializeRequestsFile()

        let jsonData: string;
        try {
            jsonData = await fs.readFile(dataFilePath, 'utf8')
        } catch (readError) {
            await fs.writeFile(dataFilePath, '[]', 'utf8')
            return NextResponse.json([])
        }
        
        if (!jsonData.trim()) {
            return NextResponse.json([])
        }

        try {
            const requests = JSON.parse(jsonData)
            if (!Array.isArray(requests)) {
                await fs.writeFile(dataFilePath, '[]', 'utf8')
                return NextResponse.json([])
            }
            return NextResponse.json(requests)
        } catch (parseError) {
            await fs.writeFile(dataFilePath, '[]', 'utf8')
            return NextResponse.json([])
        }
    } catch (error) {
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
    try {
        const data = await request.json()
        await initializeRequestsFile()

        if (data.status === 'approved') {
            const jsonData = await fs.readFile(dataFilePath, 'utf8')
            let requests = JSON.parse(jsonData)
            requests = requests.filter((req: any) => req.id !== data.id)
            await fs.writeFile(dataFilePath, JSON.stringify(requests, null, 2), 'utf8')
            return NextResponse.json({ success: true })
        }

        // Leer solicitudes actuales
        const jsonData = await fs.readFile(dataFilePath, 'utf8')
        let requests = JSON.parse(jsonData)

        // Generar ID único
        const id = Date.now()
        const newRequest = { ...data, id, timestamp: new Date().toISOString(), status: 'pending' }
        requests.push(newRequest)

        // Guardar actualización
        await fs.writeFile(dataFilePath, JSON.stringify(requests, null, 2), 'utf8')
        return NextResponse.json(newRequest)
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        return new NextResponse(
            JSON.stringify({ error: 'Error processing request', details: errorMessage }),
            { 
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        )
    }
}
