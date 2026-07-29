export function formatDate(dateStr: string, includeYear = false): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return includeYear ? `${day}/${month}/${year}` : `${day}/${month}`;
}

export function getDayName(dateStr: string): string {
  const dateObj = new Date(dateStr + 'T00:00:00');
  const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
  return dayName.charAt(0).toUpperCase() + dayName.slice(1);
}

export function getMonthName(dateStr: string): string {
  const dateObj = new Date(dateStr + 'T00:00:00');
  const monthName = dateObj.toLocaleDateString('pt-BR', { month: 'long' });
  return monthName.charAt(0).toUpperCase() + monthName.slice(1);
}

export function getYear(dateStr: string): string {
  const parts = dateStr.split('-');
  return parts[0] || '';
}

// Check if a date string is Saturday or Sunday
export function isWeekend(dateStr: string): boolean {
  const dateObj = new Date(dateStr + 'T00:00:00');
  const day = dateObj.getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
}

// Group items by date
export function groupItemsByDate<T extends { data: string }>(items: T[]): { [date: string]: T[] } {
  return items.reduce((acc, item) => {
    if (!acc[item.data]) {
      acc[item.data] = [];
    }
    acc[item.data].push(item);
    return acc;
  }, {} as { [date: string]: T[] });
}

// Auto-calculates function display labels for Monitores and Resgatistas based on the day list order
export function getDisplayFuncao(
  itemFuncao: string, 
  itemColaboradorId: string, 
  dayItens: { colaborador_id: string; funcao: string }[]
): string {
  const normalized = itemFuncao.trim();
  
  if (normalized === 'Monitor' || normalized === 'Caixa') {
    const monitorItems = dayItens.filter(i => i.funcao.trim() === 'Monitor' || i.funcao.trim() === 'Caixa');
    const index = monitorItems.findIndex(i => i.colaborador_id === itemColaboradorId);
    
    if (index === 0) return 'Monitor 1 - Tirolesa';
    if (index === 1) return 'Monitor 2 - Base';
    if (index === 2) return 'Monitor 3 Base/Caixa';
    return `Monitor ${index + 1}`;
  }
  
  if (normalized === 'Resgatista') {
    const resgatistaItems = dayItens.filter(i => i.funcao.trim() === 'Resgatista');
    const index = resgatistaItems.findIndex(i => i.colaborador_id === itemColaboradorId);
    
    if (index === 0) return 'Resgatista 1';
    if (index === 1) return 'Resgatista 2';
    return `Resgatista ${index + 1}`;
  }
  
  return normalized;
}
