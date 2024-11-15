'use client'

import { FaTree, FaIndustry, FaStore } from 'react-icons/fa'
interface TimelineStep {
    hash: string
    timestamp: string
    participant: {
        name: string
        role: string
        address: string
    }
    details: {
        [key: string]: string | number
    }
}

interface ProductTimelineProps {
    data: {
        steps: TimelineStep[]
        batchId: string
    }
}

export default function ProductTimeline({ data }: ProductTimelineProps) {
    const getIcon = (role: string) => {
        switch (role) {
            case 'Productor':
                return <FaTree className="w-8 h-8 text-green-600" />
            case 'Fabrica':
                return <FaIndustry className="w-8 h-8 text-blue-600" />
            case 'Minorista':
                return <FaStore className="w-8 h-8 text-purple-600" />
            default:
                return null
        }
    }

    return (
        <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-8 text-center">
                Trazabilidad del Producto
            </h2>
            <div className="relative">
                {data.steps.map((step, index) => (
                    <div key={step.hash} className="mb-8 flex">
                        <div className="flex-shrink-0 w-12 flex justify-center">
                            {getIcon(step.participant.role)}
                        </div>
                        <div className="ml-4 flex-grow">
                            <div className="bg-white rounded-lg shadow-md p-4">
                                <div className="font-bold text-lg mb-2">
                                    {step.participant.role}
                                </div>
                                <div className="text-sm text-gray-600 mb-2">
                                    {new Date(step.timestamp).toLocaleDateString()}
                                </div>
                                <div className="text-sm mb-2">
                                    {step.participant.name}
                                </div>
                                <div className="text-xs text-gray-500 break-all">
                                    Hash: {step.hash}
                                </div>
                                {Object.entries(step.details).map(([key, value]) => (
                                    <div key={key} className="text-sm mt-2">
                                        <span className="font-semibold">{key}:</span> {value}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
