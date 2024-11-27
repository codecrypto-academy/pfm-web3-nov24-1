export const attributeLabels: { [key: string]: string } = {
    metodoRecoleccion: 'Método de Recolección',
    'Tipo_Producto': 'Tipo de Producto',
    'EsReceta': 'Es Receta',
    'Nombre': 'Nombre',
    'Descripcion': 'Descripción',
    'Fecha': 'Fecha',
    'Creador': 'Creador',
    'Cantidad': 'Cantidad',
    'Token_Origen': 'Token Origen',
    // Mapeos para ingredientes
    'Ingrediente_Aceituna_Blanca': 'Aceituna Blanca',
    'Ingrediente_Aceituna_Negra': 'Aceituna Negra',
    'Ingrediente_Aceite': 'Aceite',
    'Esreceta': 'Es Receta',
    'temperatura': 'Temperatura',
    'color': 'Color',
    // Añadir más mapeos según sea necesario
};

export const formatAttributeName = (name: string): string => {
    // Si es un ingrediente, extraer el nombre del ingrediente
    if (name.startsWith('Ingrediente_')) {
        return 'Ingrediente: ' + name.replace('Ingrediente_', '').replace(/_/g, ' ');
    }
    return attributeLabels[name] || name.split(/(?=[A-Z_])/).join(' ').replace(/_/g, ' ');
};
