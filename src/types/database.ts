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
  data_inicio: string; // AAAA-MM-DD (Segunda-feira da semana)
  data_fim: string;    // AAAA-MM-DD (Domingo da semana)
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
  data: string;        // AAAA-MM-DD (dia específico, ex: Sexta, Sábado, Domingo)
  turno: string;       // ex: '10:00 - 18:00'
  funcao: string;      // ex: 'Caixa'
  treinamento?: boolean;
  comentario_interno?: string;
  falta?: boolean;
  created_at?: string;
  // Campos de relação de junção (join) por conveniência
  colaborador?: Colaborador;
}

export interface EscalaWithItens extends Escala {
  itens: (EscalaItem & { colaborador?: Colaborador })[];
}
