export interface Colaborador {
  id: string;
  nome: string;
  telefone?: string;
  funcao_padrao: string;
  ativo: boolean;
  created_at?: string;
  pontos?: number;
}

export interface Escala {
  id: string;
  data_inicio: string; // YYYY-MM-DD (Monday of the week)
  data_fim: string;    // YYYY-MM-DD (Sunday of the week)
  publicada: boolean;
  sabado_cancelado: boolean;
  domingo_cancelado: boolean;
  observacoes?: string;
  created_at?: string;
  finalizada?: boolean;
}

export interface EscalaItem {
  id: string;
  escala_id: string;
  colaborador_id: string;
  data: string;        // YYYY-MM-DD (specific day, e.g. Friday, Saturday, Sunday)
  turno: string;       // e.g. '10:00 - 18:00'
  funcao: string;      // e.g. 'Caixa'
  treinamento?: boolean;
  comentario_interno?: string;
  falta?: boolean;
  created_at?: string;
  // Joined relation fields for convenience
  colaborador?: Colaborador;
}

export interface EscalaWithItens extends Escala {
  itens: (EscalaItem & { colaborador?: Colaborador })[];
}
