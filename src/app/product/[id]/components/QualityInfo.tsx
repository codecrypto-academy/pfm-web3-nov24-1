'use client';

export default function QualityInfo() {
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Análisis de Calidad</h2>
      
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold">Acidez</h3>
          <p>0.2%</p>
        </div>
        
        <div>
          <h3 className="font-semibold">Índice de Peróxidos</h3>
          <p>8 meq O2/kg</p>
        </div>
        
        <div>
          <h3 className="font-semibold">Características Organolépticas</h3>
          <ul className="list-disc pl-5 mt-2">
            <li>Frutado intenso</li>
            <li>Notas de hierba fresca</li>
            <li>Picante y amargo equilibrados</li>
          </ul>
        </div>
        
        <div>
          <h3 className="font-semibold">Fecha de Análisis</h3>
          <p>20 Oct 2023</p>
        </div>
        
        <div className="mt-4 pt-4 border-t">
          <h3 className="font-semibold mb-2">Verificación Blockchain</h3>
          <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors">
            Ver en Blockchain
          </button>
        </div>
      </div>
    </div>
  );
}
