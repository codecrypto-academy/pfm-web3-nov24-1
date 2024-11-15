import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const dataFilePath = path.join(process.cwd(), 'data', 'requests.json')

export async function GET() {
    try {
        const jsonData = await fs.readFile(dataFilePath, 'utf8')
        const requests = JSON.parse(jsonData)
        return NextResponse.json(requests)
    } catch (error) {
        return NextResponse.json({ error: 'Error reading requests' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const data = await request.json()

        if (data.status === 'approved') {
            // Read current requests
            const jsonData = await fs.readFile(dataFilePath, 'utf8')
            let requests = JSON.parse(jsonData)

            // Filter out the approved request
            requests = requests.filter((req: any) => req.id !== data.id)

            // Write back the filtered requests
            await fs.writeFile(dataFilePath, JSON.stringify(requests, null, 2))

            return NextResponse.json({ message: 'Request removed successfully' })
        }

        // Handle new request submission
        let requests = []
        try {
            const jsonData = await fs.readFile(dataFilePath, 'utf8')
            requests = JSON.parse(jsonData)
        } catch {
            await fs.mkdir(path.join(process.cwd(), 'data'), { recursive: true })
        }

        requests.push({
            ...data,
            id: Date.now(),
            status: 'pending',
            timestamp: new Date().toISOString()
        })

        await fs.writeFile(dataFilePath, JSON.stringify(requests, null, 2))

        return NextResponse.json({ message: 'Request saved successfully' })
    } catch (error) {
        return NextResponse.json({ error: 'Error processing request' }, { status: 500 })
    }
}
