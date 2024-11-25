export const attributeLabels: { [key: string]: string } = {
    metodoRecoleccion: 'Método de Recolección',
    'Tipo_Producto': 'Tipo de Producto',
    esRemesa: 'Es Remesa',
    // Añadir más mapeos según sea necesario
};

export const formatAttributeName = (name: string): string => {
    return attributeLabels[name] || name.split(/(?=[A-Z_])/).join(' ').replace(/_/g, ' ');
};
