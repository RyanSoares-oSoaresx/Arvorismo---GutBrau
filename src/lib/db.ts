import { supabase, isSupabaseConfigured } from './supabase';
import { Colaborador, Escala, EscalaItem, EscalaWithItens } from '../types/database';

// --- MOCK DATABASE IMPLEMENTATION (localStorage) ---
const LOCAL_STORAGE_KEYS = {
  COLABORADORES: 'gutbrau_colaboradores',
  ESCALAS: 'gutbrau_escalas',
  ESCALA_ITENS: 'gutbrau_escala_itens',
};

const defaultColaboradores: Colaborador[] = [
  { id: 'c1', nome: 'André Rechia', telefone: '', funcao_padrao: 'Monitor', ativo: true, pontos: 10 },
  { id: 'c2', nome: 'Claufer Scurra', telefone: '', funcao_padrao: 'Monitor', ativo: true, pontos: 10 },
  { id: 'c3', nome: 'Guilherme Aguilhera', telefone: '', funcao_padrao: 'Resgatista', ativo: true, pontos: 10 },
  { id: 'c4', nome: 'Leandro', telefone: '', funcao_padrao: 'Monitor', ativo: true, pontos: 10 },
  { id: 'c5', nome: 'Adilson Corrêa Macêdo', telefone: '+55 47 9690-9398', funcao_padrao: 'Monitor', ativo: true, pontos: 10 },
  { id: 'c6', nome: 'Adrian', telefone: '+55 79 8160-4431', funcao_padrao: 'Monitor', ativo: true, pontos: 10 },
  { id: 'c7', nome: 'Ana Julia', telefone: '+55 47 9691-1349', funcao_padrao: 'Monitor', ativo: true, pontos: 10 },
  { id: 'c8', nome: 'Andreia Gutknecht', telefone: '+55 47 9132-4981', funcao_padrao: 'Caixa', ativo: true, pontos: 10 },
  { id: 'c9', nome: 'Arthur S.', telefone: '+55 47 8883-8392', funcao_padrao: 'Monitor', ativo: true, pontos: 10 },
  { id: 'c10', nome: 'Barcelar', telefone: '+55 11 99282-9529', funcao_padrao: 'Monitor', ativo: true, pontos: 10 },
  { id: 'c11', nome: 'Davi', telefone: '+55 47 9245-7850', funcao_padrao: 'Monitor', ativo: true, pontos: 10 },
  { id: 'c12', nome: 'Djonatan Alves', telefone: '+55 47 9650-7594', funcao_padrao: 'Monitor', ativo: true, pontos: 10 },
  { id: 'c13', nome: 'Gabriel', telefone: '+55 47 9140-3058', funcao_padrao: 'Monitor', ativo: true, pontos: 10 },
  { id: 'c14', nome: 'Gabriel Rosa', telefone: '+55 47 9643-5644', funcao_padrao: 'Resgatista', ativo: true, pontos: 10 },
  { id: 'c15', nome: 'Helo', telefone: '+55 47 8499-2868', funcao_padrao: 'Monitor', ativo: true, pontos: 10 },
  { id: 'c16', nome: 'Henrique Saragoça', telefone: '+55 47 8802-4156', funcao_padrao: 'Monitor', ativo: true, pontos: 10 },
  { id: 'c17', nome: 'Jordão Rafael', telefone: '+55 47 9151-1738', funcao_padrao: 'Resgatista', ativo: true, pontos: 10 },
  { id: 'c18', nome: 'Karoline', telefone: '+55 47 8850-8894', funcao_padrao: 'Monitor', ativo: true, pontos: 10 },
  { id: 'c19', nome: 'Mohrr', telefone: '+55 47 9908-2394', funcao_padrao: 'Monitor', ativo: true, pontos: 10 },
  { id: 'c20', nome: 'Nicole Kaiser', telefone: '+55 47 9236-6921', funcao_padrao: 'Monitor', ativo: true, pontos: 10 },
  { id: 'c21', nome: 'Você (Supervisor)', telefone: '+55 47 9994-6760', funcao_padrao: 'Monitor', ativo: true, pontos: 10 },
  { id: 'c22', nome: 'Vitor', telefone: '+55 47 9914-0659', funcao_padrao: 'Monitor', ativo: true, pontos: 10 },
  { id: 'c23', nome: 'Vitor Hugo Wielewski', telefone: '+55 47 9997-2848', funcao_padrao: 'Resgatista', ativo: true, pontos: 10 },
  { id: 'c24', nome: 'Victor', telefone: '+55 47 8838-7696', funcao_padrao: 'Monitor', ativo: true, pontos: 10 },
  { id: 'c25', nome: 'Ryan', telefone: '', funcao_padrao: 'Resgatista', ativo: true, pontos: 10 },
  { id: 'c26', nome: 'Paulo', telefone: '', funcao_padrao: 'Monitor', ativo: true, pontos: 10 },
];

// Helper to get week start date (Monday) and end date (Sunday) of a given date
export function getWeekRange(d: Date = new Date()) {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const monday = new Date(d.setDate(diff));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  return {
    inicio: monday.toISOString().split('T')[0],
    fim: sunday.toISOString().split('T')[0]
  };
}

const initializeMockData = () => {
  if (typeof window === 'undefined') return;

  const currentCols = localStorage.getItem(LOCAL_STORAGE_KEYS.COLABORADORES);
  let shouldReset = false;
  if (currentCols) {
    try {
      const parsed = JSON.parse(currentCols);
      const currentItens = localStorage.getItem(LOCAL_STORAGE_KEYS.ESCALA_ITENS);
      const currentScales = localStorage.getItem(LOCAL_STORAGE_KEYS.ESCALAS);
      // Reset if items count is not exactly 10 (which is the new equalized scale size)
      // or if scales still contain the old single "cancelada" column.
      if (
        parsed.length < 26 || 
        (currentScales && JSON.parse(currentScales).length < 2) ||
        (currentScales && JSON.parse(currentScales)[0]?.hasOwnProperty('cancelada'))
      ) {
        shouldReset = true;
      }
    } catch (e) {
      shouldReset = true;
    }
  }

  if (shouldReset) {
    localStorage.removeItem(LOCAL_STORAGE_KEYS.COLABORADORES);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.ESCALAS);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.ESCALA_ITENS);
  }

  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.COLABORADORES)) {
    localStorage.setItem(LOCAL_STORAGE_KEYS.COLABORADORES, JSON.stringify(defaultColaboradores));
  }

  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.ESCALAS)) {
    const range = getWeekRange();
    const mockEscalas: Escala[] = [
      {
        id: 'e1',
        data_inicio: range.inicio,
        data_fim: range.fim,
        publicada: true,
        sabado_cancelado: false,
        domingo_cancelado: false,
        observacoes: 'Atenção aos cabos de segurança da Tirolesa e checagem de EPIs de manhã cedo! 🧗‍♂️🌲',
      },
      {
        id: 'e2',
        data_inicio: '2026-07-20',
        data_fim: '2026-07-26',
        publicada: true,
        sabado_cancelado: false,
        domingo_cancelado: false,
        observacoes: 'Escala oficial de recreação e arvorismo realizada no fim de semana de 25/07 e 26/07.',
      }
    ];
    localStorage.setItem(LOCAL_STORAGE_KEYS.ESCALAS, JSON.stringify(mockEscalas));

    const satDate = new Date(range.inicio);
    satDate.setDate(satDate.getDate() + 5);
    const sunDate = new Date(range.inicio);
    sunDate.setDate(sunDate.getDate() + 6);
    
    const satStr = satDate.toISOString().split('T')[0];
    const sunStr = sunDate.toISOString().split('T')[0];

    const mockItens: EscalaItem[] = [
      // Escala e1 (Atual) - Sábado: 3 Monitores e 2 Resgatistas
      { id: 'i1', escala_id: 'e1', colaborador_id: 'c1', data: satStr, turno: '10:00 - 18:00', funcao: 'Monitor' },
      { id: 'i2', escala_id: 'e1', colaborador_id: 'c7', data: satStr, turno: '10:00 - 18:00', funcao: 'Monitor' },
      { id: 'i3', escala_id: 'e1', colaborador_id: 'c3', data: satStr, turno: '10:00 - 18:00', funcao: 'Resgatista' },
      { id: 'i4', escala_id: 'e1', colaborador_id: 'c9', data: satStr, turno: '10:00 - 18:00', funcao: 'Monitor' },
      { id: 'i5', escala_id: 'e1', colaborador_id: 'c17', data: satStr, turno: '10:00 - 18:00', funcao: 'Resgatista' },
      
      // Escala e1 (Atual) - Domingo: 3 Monitores e 2 Resgatistas
      { id: 'i6', escala_id: 'e1', colaborador_id: 'c6', data: sunStr, turno: '10:00 - 18:00', funcao: 'Monitor' },
      { id: 'i7', escala_id: 'e1', colaborador_id: 'c22', data: sunStr, turno: '10:00 - 18:00', funcao: 'Monitor' },
      { id: 'i8', escala_id: 'e1', colaborador_id: 'c23', data: sunStr, turno: '10:00 - 18:00', funcao: 'Resgatista' },
      { id: 'i9', escala_id: 'e1', colaborador_id: 'c8', data: sunStr, turno: '10:00 - 18:00', funcao: 'Caixa' },
      { id: 'i10', escala_id: 'e1', colaborador_id: 'c14', data: sunStr, turno: '10:00 - 18:00', funcao: 'Resgatista' },

      // Escala e2 (Semana Passada 25/07) - Sábado: 3 Monitores, 2 Resgatistas e 1 Caixa
      { id: 'i11', escala_id: 'e2', colaborador_id: 'c25', data: '2026-07-25', turno: '10:00 - 18:00', funcao: 'Resgatista' },
      { id: 'i12', escala_id: 'e2', colaborador_id: 'c23', data: '2026-07-25', turno: '10:00 - 18:00', funcao: 'Resgatista' },
      { id: 'i13', escala_id: 'e2', colaborador_id: 'c26', data: '2026-07-25', turno: '10:00 - 18:00', funcao: 'Monitor' },
      { id: 'i14', escala_id: 'e2', colaborador_id: 'c22', data: '2026-07-25', turno: '10:00 - 18:00', funcao: 'Monitor' },
      { id: 'i15', escala_id: 'e2', colaborador_id: 'c2', data: '2026-07-25', turno: '10:00 - 18:00', funcao: 'Monitor' },
      { id: 'i16', escala_id: 'e2', colaborador_id: 'c4', data: '2026-07-25', turno: '10:00 - 18:00', funcao: 'Caixa' },

      // Escala e2 (Semana Passada 26/07) - Domingo: 3 Monitores, 1 Resgatista e 1 Caixa
      { id: 'i17', escala_id: 'e2', colaborador_id: 'c25', data: '2026-07-26', turno: '10:00 - 18:00', funcao: 'Resgatista' },
      { id: 'i18', escala_id: 'e2', colaborador_id: 'c26', data: '2026-07-26', turno: '10:00 - 18:00', funcao: 'Monitor' },
      { id: 'i19', escala_id: 'e2', colaborador_id: 'c22', data: '2026-07-26', turno: '10:00 - 18:00', funcao: 'Monitor' },
      { id: 'i20', escala_id: 'e2', colaborador_id: 'c2', data: '2026-07-26', turno: '10:00 - 18:00', funcao: 'Monitor' },
      { id: 'i21', escala_id: 'e2', colaborador_id: 'c15', data: '2026-07-26', turno: '10:00 - 18:00', funcao: 'Caixa' },
    ];
    localStorage.setItem(LOCAL_STORAGE_KEYS.ESCALA_ITENS, JSON.stringify(mockItens));
  }
};

// Safe LocalStorage accessors
const getLocalData = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  initializeMockData();
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultValue;
};

const setLocalData = <T>(key: string, data: T): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
};

// --- DATA ACCESS METHODS ---

export const db = {
  // --- COLABORADORES ---
  async getColaboradores(): Promise<Colaborador[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('colaboradores')
        .select('*')
        .order('nome', { ascending: true });
      if (error) throw error;
      return (data || []).map(c => ({
        ...c,
        pontos: c.pontos !== undefined && c.pontos !== null ? c.pontos : 10
      }));
    } else {
      const data = getLocalData<Colaborador[]>(LOCAL_STORAGE_KEYS.COLABORADORES, []);
      return data.map(c => ({
        ...c,
        pontos: c.pontos !== undefined && c.pontos !== null ? c.pontos : 10
      })).sort((a, b) => a.nome.localeCompare(b.nome));
    }
  },

  async saveColaborador(colaborador: Omit<Colaborador, 'id'> & { id?: string }): Promise<Colaborador> {
    if (isSupabaseConfigured && supabase) {
      if (colaborador.id) {
        const { data, error } = await supabase
          .from('colaboradores')
          .update(colaborador)
          .eq('id', colaborador.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('colaboradores')
          .insert(colaborador)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    } else {
      const colaboradores = getLocalData<Colaborador[]>(LOCAL_STORAGE_KEYS.COLABORADORES, []);
      const newColaborador: Colaborador = {
        ...colaborador,
        id: colaborador.id || 'c_' + Math.random().toString(36).substr(2, 9),
      } as Colaborador;

      if (colaborador.id) {
        const idx = colaboradores.findIndex(c => c.id === colaborador.id);
        if (idx !== -1) colaboradores[idx] = newColaborador;
      } else {
        colaboradores.push(newColaborador);
      }
      
      setLocalData(LOCAL_STORAGE_KEYS.COLABORADORES, colaboradores);
      return newColaborador;
    }
  },

  async deleteColaborador(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('colaboradores')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } else {
      const colaboradores = getLocalData<Colaborador[]>(LOCAL_STORAGE_KEYS.COLABORADORES, []);
      const updated = colaboradores.filter(c => c.id !== id);
      setLocalData(LOCAL_STORAGE_KEYS.COLABORADORES, updated);

      // Cascade delete scale items mock-side
      const items = getLocalData<EscalaItem[]>(LOCAL_STORAGE_KEYS.ESCALA_ITENS, []);
      const filteredItems = items.filter(item => item.colaborador_id !== id);
      setLocalData(LOCAL_STORAGE_KEYS.ESCALA_ITENS, filteredItems);
    }
  },

  // --- ESCALAS ---
  async getEscalas(): Promise<Escala[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('escalas')
        .select('*')
        .order('data_inicio', { ascending: false });
      if (error) throw error;
      return data || [];
    } else {
      return getLocalData<Escala[]>(LOCAL_STORAGE_KEYS.ESCALAS, [])
        .sort((a, b) => b.data_inicio.localeCompare(a.data_inicio));
    }
  },

  async getEscalaById(id: string): Promise<EscalaWithItens | null> {
    if (isSupabaseConfigured && supabase) {
      const { data: escala, error: escError } = await supabase
        .from('escalas')
        .select('*')
        .eq('id', id)
        .single();
      
      if (escError) {
        if (escError.code === 'PGRST116') return null; // not found
        throw escError;
      }

      const { data: itens, error: itError } = await supabase
        .from('escala_itens')
        .select('*, colaborador:colaboradores(*)')
        .eq('escala_id', id);
      
      if (itError) throw itError;

      return {
        ...escala,
        itens: itens || [],
      };
    } else {
      const escalas = getLocalData<Escala[]>(LOCAL_STORAGE_KEYS.ESCALAS, []);
      const escala = escalas.find(e => e.id === id);
      if (!escala) return null;

      const items = getLocalData<EscalaItem[]>(LOCAL_STORAGE_KEYS.ESCALA_ITENS, []);
      const colaboradores = getLocalData<Colaborador[]>(LOCAL_STORAGE_KEYS.COLABORADORES, []);

      const scaleItens = items
        .filter(item => item.escala_id === id)
        .map(item => ({
          ...item,
          colaborador: colaboradores.find(c => c.id === item.colaborador_id)
        }));

      return {
        ...escala,
        itens: scaleItens,
      };
    }
  },

  async getEscalaAtiva(): Promise<EscalaWithItens | null> {
    if (isSupabaseConfigured && supabase) {
      // Get the most recent published scale
      const { data: escalas, error: escError } = await supabase
        .from('escalas')
        .select('*')
        .eq('publicada', true)
        .order('data_inicio', { ascending: false })
        .limit(1);
      
      if (escError) throw escError;
      if (!escalas || escalas.length === 0) return null;

      const escala = escalas[0];
      const { data: itens, error: itError } = await supabase
        .from('escala_itens')
        .select('*, colaborador:colaboradores(*)')
        .eq('escala_id', escala.id);
      
      if (itError) throw itError;

      return {
        ...escala,
        itens: itens || [],
      };
    } else {
      const escalas = getLocalData<Escala[]>(LOCAL_STORAGE_KEYS.ESCALAS, []);
      // Get most recent published scale
      const published = escalas
        .filter(e => e.publicada)
        .sort((a, b) => b.data_inicio.localeCompare(a.data_inicio));
      
      if (published.length === 0) return null;
      
      return this.getEscalaById(published[0].id);
    }
  },

  async saveEscala(
    escala: Omit<Escala, 'id'> & { id?: string },
    itens: Omit<EscalaItem, 'id' | 'escala_id'>[]
  ): Promise<EscalaWithItens> {
    if (isSupabaseConfigured && supabase) {
      let savedEscala: Escala;
      
      if (escala.id) {
        const { data, error } = await supabase
          .from('escalas')
          .update(escala)
          .eq('id', escala.id)
          .select()
          .single();
        if (error) throw error;
        savedEscala = data;
      } else {
        const { data, error } = await supabase
          .from('escalas')
          .insert(escala)
          .select()
          .single();
        if (error) throw error;
        savedEscala = data;
      }

      // Delete old items if updating
      if (escala.id) {
        const { error: delError } = await supabase
          .from('escala_itens')
          .delete()
          .eq('escala_id', escala.id);
        if (delError) throw delError;
      }

      // Insert new items
      const itemsToInsert = itens.map(item => ({
        escala_id: savedEscala.id,
        colaborador_id: item.colaborador_id,
        data: item.data,
        turno: item.turno,
        funcao: item.funcao,
        treinamento: (item as any).treinamento || false,
      }));

      if (itemsToInsert.length > 0) {
        const { error: insError } = await supabase
          .from('escala_itens')
          .insert(itemsToInsert);
        if (insError) throw insError;
      }

      const fullEscala = await this.getEscalaById(savedEscala.id);
      return fullEscala!;
    } else {
      const escalas = getLocalData<Escala[]>(LOCAL_STORAGE_KEYS.ESCALAS, []);
      const targetId = escala.id || 'e_' + Math.random().toString(36).substr(2, 9);
      
      const newEscala: Escala = {
        ...escala,
        id: targetId,
      } as Escala;

      if (escala.id) {
        const idx = escalas.findIndex(e => e.id === escala.id);
        if (idx !== -1) escalas[idx] = newEscala;
      } else {
        escalas.push(newEscala);
      }
      setLocalData(LOCAL_STORAGE_KEYS.ESCALAS, escalas);

      // Update items
      const allItens = getLocalData<EscalaItem[]>(LOCAL_STORAGE_KEYS.ESCALA_ITENS, []);
      // Filter out old ones for this scale
      const filtered = allItens.filter(item => item.escala_id !== targetId);
      
      // Append new ones
      const newItens: EscalaItem[] = itens.map(item => ({
        ...item,
        id: 'i_' + Math.random().toString(36).substr(2, 9),
        escala_id: targetId,
      }));

      setLocalData(LOCAL_STORAGE_KEYS.ESCALA_ITENS, [...filtered, ...newItens]);

      const fullEscala = await this.getEscalaById(targetId);
      return fullEscala!;
    }
  },

  async deleteEscala(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('escalas')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } else {
      const escalas = getLocalData<Escala[]>(LOCAL_STORAGE_KEYS.ESCALAS, []);
      setLocalData(LOCAL_STORAGE_KEYS.ESCALAS, escalas.filter(e => e.id !== id));

      const items = getLocalData<EscalaItem[]>(LOCAL_STORAGE_KEYS.ESCALA_ITENS, []);
      setLocalData(LOCAL_STORAGE_KEYS.ESCALA_ITENS, items.filter(item => item.escala_id !== id));
    }
  }
};
