'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  Calendar, 
  Info,
  Clock,
  User,
  AlertTriangle,
  Briefcase,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Wand2,
  Check,
  CheckCircle,
  Unlock,
  Lock,
  MessageSquare
} from 'lucide-react';
import { db } from '@/lib/db';
import { Colaborador, Escala, EscalaItem } from '@/types/database';
import { formatDate } from '@/lib/utils';

interface AvailabilityParseResult {
  nomeOriginal: string;
  colaborador: Colaborador | null;
  sabado: boolean;
  domingo: boolean;
  status: 'sucesso' | 'nao_encontrado' | 'ambiguo';
  candidatos?: Colaborador[];
}

const cleanString = (str: string) => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .trim();
};

const parseAvailability = (text: string, activeCollabs: Colaborador[]): AvailabilityParseResult[] => {
  if (!text) return [];
  const lines = text.split('\n');
  const results: AvailabilityParseResult[] = [];
  
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    if (line.includes('⬇️') || line.includes('👇')) continue;
    if (line.toLowerCase().includes('bom dia') || line.toLowerCase().includes('favor colocar') || line.toLowerCase().includes('disponibilidade')) continue;
    
    let parts: string[] = [];
    if (line.includes('-')) {
      parts = line.split('-');
    } else if (line.includes(':')) {
      parts = line.split(':');
    } else {
      const matchIndex = line.toLowerCase().search(/\b(sabado|sábado|domingo|sab|dom)\b/);
      if (matchIndex !== -1) {
        parts = [line.substring(0, matchIndex), line.substring(matchIndex)];
      } else {
        parts = [line];
      }
    }
    
    const rawName = parts[0]?.trim();
    const rawDays = parts[1]?.trim() || '';
    
    if (!rawName || rawName.length < 2) continue;
    
    const cleanDays = cleanString(rawDays);
    const cleanLine = cleanString(line);
    
    let hasSabado = false;
    let hasDomingo = false;
    
    const daysSource = cleanDays || cleanLine;
    if (daysSource.includes('sabado') || daysSource.includes('sab') || daysSource.includes('sabs')) {
      hasSabado = true;
    }
    if (daysSource.includes('domingo') || daysSource.includes('dom') || daysSource.includes('doms')) {
      hasDomingo = true;
    }
    if (daysSource.includes('fim de semana') || daysSource.includes('fds') || daysSource.includes('ambos') || daysSource.includes('sábado e domingo') || daysSource.includes('sabado e domingo') || daysSource.includes('sab e dom')) {
      hasSabado = true;
      hasDomingo = true;
    }
    
    if (!hasSabado && !hasDomingo) {
      hasSabado = true;
      hasDomingo = true;
    }
    
    const cleanNameVal = cleanString(rawName);
    let matchedCollab: Colaborador | null = null;
    let status: 'sucesso' | 'nao_encontrado' | 'ambiguo' = 'nao_encontrado';
    let candidates: Colaborador[] = [];
    
    candidates = activeCollabs.filter(collab => {
      const dbClean = cleanString(collab.nome);
      return dbClean === cleanNameVal || dbClean.includes(cleanNameVal) || cleanNameVal.includes(dbClean);
    });
    
    if (candidates.length === 0) {
      const parsedWords = cleanNameVal.split(/\s+/).filter(w => w.length > 2);
      candidates = activeCollabs.filter(collab => {
        const dbWords = cleanString(collab.nome).split(/\s+/).filter(w => w.length > 2);
        return parsedWords.some(pw => dbWords.some(dw => dw === pw || dw.includes(pw) || pw.includes(dw)));
      });
    }
    
    if (candidates.length === 1) {
      matchedCollab = candidates[0];
      status = 'sucesso';
    } else if (candidates.length > 1) {
      const exactCandidate = candidates.find(c => cleanString(c.nome) === cleanNameVal);
      if (exactCandidate) {
        matchedCollab = exactCandidate;
        status = 'sucesso';
      } else {
        matchedCollab = candidates[0];
        status = 'ambiguo';
      }
    }
    
    results.push({
      nomeOriginal: rawName,
      colaborador: matchedCollab,
      sabado: hasSabado,
      domingo: hasDomingo,
      status,
      candidatos: candidates,
    });
  }
  return results;
};

const allocateForDay = (dateStr: string, availableCollabs: Colaborador[]) => {
  const assignedIds = new Set<string>();
  const dayItens: any[] = [];
  
  const pool = [...availableCollabs].sort((a, b) => {
    const pA = a.pontos !== undefined ? a.pontos : 10;
    const pB = b.pontos !== undefined ? b.pontos : 10;
    return pB - pA;
  });
  
  const numAvailable = pool.length;
  
  const allSlots = [
    { funcao: 'Resgatista 1', roleType: 'Resgatista' },
    { funcao: 'Resgatista 2', roleType: 'Resgatista' },
    { funcao: 'Monitor I (Tirolesa)', roleType: 'Monitor' },
    { funcao: 'Monitor II (Base)', roleType: 'Monitor' },
    { funcao: 'Monitor III (Bike/Caixa)', roleType: 'Monitor' },
    { funcao: 'Caixa', roleType: 'Caixa' },
    { funcao: 'Monitor IV (Tirolesa/Base)', roleType: 'Monitor' }
  ];
  
  // Decide how many slots to fill based on the number of available people (max 7)
  const maxSlotsToFill = Math.min(numAvailable, 7);
  
  const slots: typeof allSlots = [];
  if (maxSlotsToFill >= 1) slots.push(allSlots[0]); // Resgatista 1
  if (maxSlotsToFill >= 2) slots.push(allSlots[1]); // Resgatista 2
  if (maxSlotsToFill >= 3) slots.push(allSlots[2]); // Monitor I
  if (maxSlotsToFill >= 4) slots.push(allSlots[3]); // Monitor II
  if (maxSlotsToFill >= 5) slots.push(allSlots[4]); // Monitor III
  if (maxSlotsToFill >= 6) slots.push(allSlots[5]); // Caixa
  if (maxSlotsToFill >= 7) slots.push(allSlots[6]); // Monitor IV

  // First pass: try matching preferred roles
  for (const slot of slots) {
    const candidate = pool.find(c => c.funcao_padrao === slot.roleType && !assignedIds.has(c.id));
    if (candidate) {
      dayItens.push({
        colaborador_id: candidate.id,
        data: dateStr,
        turno: '10:00 - 18:00',
        funcao: slot.funcao,
        treinamento: false
      });
      assignedIds.add(candidate.id);
    }
  }
  
  // Second pass: fill any remaining unfilled slots with anyone left in the pool
  for (const slot of slots) {
    const isFilled = dayItens.some(item => item.funcao === slot.funcao);
    if (isFilled) continue;
    const candidate = pool.find(c => !assignedIds.has(c.id));
    if (candidate) {
      dayItens.push({
        colaborador_id: candidate.id,
        data: dateStr,
        turno: '10:00 - 18:00',
        funcao: slot.funcao,
        treinamento: false
      });
      assignedIds.add(candidate.id);
    }
  }
  
  return dayItens;
};

interface EditPageProps {
  params: Promise<{ id: string }>;
}

const PRESET_TURNOS = [
  '10:00 - 18:00',
  '09:00 - 18:00',
  '08:30 - 17:30',
  '10:00 - 19:00',
  '09:00 - 14:00',
  '13:00 - 18:00',
];

export default function EditEscalaPage({ params }: EditPageProps) {
  const router = useRouter();
  const { id } = use(params);
  const isNew = id === 'novo';

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Database resources
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [loadingResources, setLoadingResources] = useState(true);

  // Form states
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [selectedSabado, setSelectedSabado] = useState('');
  const [publicada, setPublicada] = useState(false);
  const [sabadoCancelado, setSabadoCancelado] = useState(false);
  const [domingoCancelado, setDomingoCancelado] = useState(false);
  const [observacoes, setObservacoes] = useState('');
  const [itens, setItens] = useState<{
    id?: string;
    colaborador_id: string;
    data: string;
    turno: string;
    funcao: string;
    treinamento?: boolean;
    comentario_interno?: string;
    falta?: boolean;
  }[]>([]);
  const [saveLoading, setSaveLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Local helper for date list of the week
  const [diasDaSemana, setDiasDaSemana] = useState<{ nome: string; dataStr: string }[]>([]);

  // Availability assistant state
  const [assistenteAberto, setAssistenteAberto] = useState(false);
  const [textoDisponibilidade, setTextoDisponibilidade] = useState('');
  const [resultadosAnalise, setResultadosAnalise] = useState<AvailabilityParseResult[]>([]);
  const [analiseExecutada, setAnaliseExecutada] = useState(false);
  const [finalizada, setFinalizada] = useState(false);

  const handleAnalyseAvailability = () => {
    if (!textoDisponibilidade.trim()) {
      alert('Por favor, cole a disponibilidade antes de analisar.');
      return;
    }
    const analysis = parseAvailability(textoDisponibilidade, colaboradores);
    setResultadosAnalise(analysis);
    setAnaliseExecutada(true);
  };

  const handleApplyAutoSchedule = () => {
    if (resultadosAnalise.length === 0) return;
    if (!selectedSabado) {
      alert('Por favor, selecione a data do sábado da escala na Configuração Geral antes de aplicar.');
      return;
    }
    
    const satStr = selectedSabado;
    const satDate = new Date(satStr + 'T00:00:00');
    const sunDate = new Date(satDate);
    sunDate.setDate(satDate.getDate() + 1);
    const sunStr = sunDate.toISOString().split('T')[0];
    
    const satAvailable = resultadosAnalise
      .filter(r => r.sabado && (r.status === 'sucesso' || r.status === 'ambiguo') && r.colaborador)
      .map(r => r.colaborador!);
      
    const sunAvailable = resultadosAnalise
      .filter(r => r.domingo && (r.status === 'sucesso' || r.status === 'ambiguo') && r.colaborador)
      .map(r => r.colaborador!);

    const satItens = allocateForDay(satStr, satAvailable);
    const sunItens = allocateForDay(sunStr, sunAvailable);

    setItens([...satItens, ...sunItens]);
    setAssistenteAberto(false);
    alert('Escala rascunhada com sucesso! Faça os ajustes finais abaixo.');
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (selectedSabado) {
      calculateWeekDays(selectedSabado, itens);
    } else {
      setDiasDaSemana([]);
    }
  }, [selectedSabado]);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/admin/auth');
      const data = await res.json();
      if (data.authenticated) {
        setIsAuthenticated(true);
        loadResources();
      } else {
        router.push('/admin');
      }
    } catch (err) {
      console.error('Erro de autenticação:', err);
      router.push('/admin');
    } finally {
      setCheckingAuth(false);
    }
  };

  const loadResources = async () => {
    try {
      setLoadingResources(true);
      const collabs = await db.getColaboradores();
      setColaboradores(collabs.filter(c => c.ativo));

      if (!isNew) {
        const escala = await db.getEscalaById(id);
        if (escala) {
          setDataInicio(escala.data_inicio);
          setDataFim(escala.data_fim);
          setPublicada(escala.publicada);
          setSabadoCancelado(escala.sabado_cancelado || false);
          setDomingoCancelado(escala.domingo_cancelado || false);
          setFinalizada(escala.finalizada || false);
          setObservacoes(escala.observacoes || '');
          
          // Calculate selectedSabado from data_fim (Sunday) by subtracting 1 day
          const sunDate = new Date(escala.data_fim + 'T00:00:00');
          const satDate = new Date(sunDate);
          satDate.setDate(sunDate.getDate() - 1);
          const satStr = satDate.toISOString().split('T')[0];
          setSelectedSabado(satStr);

          const mappedItens = escala.itens.map(item => ({
            id: item.id,
            colaborador_id: item.colaborador_id,
            data: item.data,
            turno: item.turno,
            funcao: item.funcao,
            treinamento: item.treinamento || false,
            comentario_interno: item.comentario_interno || '',
            falta: item.falta || false,
          }));
          setItens(mappedItens);
          calculateWeekDays(satStr, mappedItens);
        } else {
          router.push('/admin');
        }
      } else {
        // Set default date to upcoming Saturday
        const today = new Date();
        const day = today.getDay();
        const diffToSaturday = day === 6 ? 0 : (day === 0 ? 6 : 6 - day); // how many days to Saturday
        const nextSaturday = new Date(today);
        nextSaturday.setDate(today.getDate() + diffToSaturday);
        const nextSaturdayStr = nextSaturday.toISOString().split('T')[0];
        setSelectedSabado(nextSaturdayStr);
      }
    } catch (err) {
      console.error('Erro ao carregar recursos:', err);
    } finally {
      setLoadingResources(false);
    }
  };

  const calculateWeekDays = (sabadoStr: string, currentItens = itens) => {
    if (!sabadoStr) return;

    const sat = new Date(sabadoStr + 'T00:00:00');
    const sun = new Date(sat);
    sun.setDate(sat.getDate() + 1);
    
    const satStr = sat.toISOString().split('T')[0];
    const sunStr = sun.toISOString().split('T')[0];

    const days: { nome: string; dataStr: string }[] = [
      { nome: 'Sábado', dataStr: satStr },
      { nome: 'Domingo', dataStr: sunStr }
    ];

    // Adiciona outros dias se houver turnos cadastrados neles
    if (currentItens && currentItens.length > 0) {
      currentItens.forEach(item => {
        if (item.data !== satStr && item.data !== sunStr) {
          const itemDate = new Date(item.data + 'T00:00:00');
          let dayOfWeekName = itemDate.toLocaleDateString('pt-BR', { weekday: 'long' });
          dayOfWeekName = dayOfWeekName.charAt(0).toUpperCase() + dayOfWeekName.slice(1);
          
          const alreadyExists = days.some(d => d.dataStr === item.data);
          if (!alreadyExists) {
            days.push({
              nome: `${dayOfWeekName} (Feriado)`,
              dataStr: item.data
            });
          }
        }
      });
    }

    days.sort((a, b) => a.dataStr.localeCompare(b.dataStr));
    setDiasDaSemana(days);

    // O início real é o menor dia da lista (ex: Sexta se feriado, ou Sábado)
    setDataInicio(days[0].dataStr);
    setDataFim(sunStr); // Fim é sempre o Domingo por padrão
  };

  // Add empty shift to a specific date
  const handleAddShift = (dataStr: string) => {
    if (colaboradores.length === 0) {
      alert('Por favor, cadastre colaboradores ativos primeiro.');
      return;
    }

    const firstCollab = colaboradores[0];
    setItens(prev => [
      ...prev,
      {
        colaborador_id: firstCollab.id,
        data: dataStr,
        turno: PRESET_TURNOS[0],
        funcao: firstCollab.funcao_padrao || 'Monitor',
        treinamento: false,
        comentario_interno: '',
        falta: false,
      }
    ]);
  };

  const handleRemoveShift = (index: number) => {
    setItens(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateShift = (index: number, field: string, value: any) => {
    setItens(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      
      const updated = { ...item, [field]: value };
      
      // If collaborator changed, automatically prefill their default role
      if (field === 'colaborador_id') {
        const collab = colaboradores.find(c => c.id === value);
        if (collab) {
          updated.funcao = collab.funcao_padrao || 'Monitor';
        }
      }
      return updated;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataInicio) {
      setErrorMsg('A data de início da semana é obrigatória.');
      return;
    }

    setErrorMsg('');
    setSaveLoading(true);

    try {
      const escalaPayload = {
        id: isNew ? undefined : id,
        data_inicio: dataInicio,
        data_fim: dataFim,
        publicada,
        sabado_cancelado: sabadoCancelado,
        domingo_cancelado: domingoCancelado,
        finalizada,
        observacoes: observacoes.trim() || undefined
      };

      // Strip temporary details before saving
      const itemsPayload = itens.map(item => ({
        colaborador_id: item.colaborador_id,
        data: item.data,
        turno: item.turno,
        funcao: item.funcao,
        treinamento: item.treinamento || false,
        comentario_interno: item.comentario_interno || '',
        falta: item.falta || false,
      }));

      // Adjust collaborator points based on new absences
      let oldItens: any[] = [];
      if (!isNew) {
        const oldEscala = await db.getEscalaById(id);
        oldItens = oldEscala ? oldEscala.itens : [];
      }

      const collabsToUpdate: Colaborador[] = [];
      const currentCollabs = await db.getColaboradores();

      currentCollabs.forEach(collab => {
        const isAbsentNow = itemsPayload.some(item => item.colaborador_id === collab.id && item.falta);
        const wasAbsentBefore = oldItens.some(item => item.colaborador_id === collab.id && item.falta);

        if (isAbsentNow && !wasAbsentBefore) {
          const currentPts = collab.pontos !== undefined ? collab.pontos : 10;
          const newPts = Math.max(0, currentPts - 3); // Deduct 3 points for absence
          collabsToUpdate.push({ ...collab, pontos: newPts });
        } else if (!isAbsentNow && wasAbsentBefore) {
          const currentPts = collab.pontos !== undefined ? collab.pontos : 10;
          const newPts = currentPts + 3; // Restore 3 points if present again
          collabsToUpdate.push({ ...collab, pontos: newPts });
        }
      });

      for (const updatedCollab of collabsToUpdate) {
        await db.saveColaborador({
          id: updatedCollab.id,
          nome: updatedCollab.nome,
          telefone: updatedCollab.telefone,
          funcao_padrao: updatedCollab.funcao_padrao,
          ativo: updatedCollab.ativo,
          pontos: updatedCollab.pontos,
        });
      }

      await db.saveEscala(escalaPayload, itemsPayload);
      router.push('/admin');
    } catch (err) {
      console.error('Erro ao salvar escala:', err);
      setErrorMsg('Falha ao salvar escala. Verifique as credenciais do Supabase.');
    } finally {
      setSaveLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
        <p className="text-stone-500 dark:text-stone-400 text-sm font-medium">Verificando credenciais...</p>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 pb-6 border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-accent/10 text-accent rounded-2xl">
            <Calendar className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-white">
              {isNew ? 'Nova Escala Semanal' : 'Editar Escala Semanal'}
            </h1>
            <p className="text-sm text-stone-500 dark:text-stone-400">Monte as escalas do final de semana da equipe</p>
          </div>
        </div>

        <Link 
          href="/admin"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-900 dark:hover:bg-stone-850 text-stone-700 dark:text-stone-300 text-sm font-semibold rounded-xl transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Cancelar
        </Link>
      </header>

      {loadingResources ? (
        <div className="flex justify-center items-center py-16">
          <div className="w-8 h-8 border-3 border-accent/20 border-t-accent rounded-full animate-spin"></div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Locked Scale Warning Banner */}
          {finalizada && (
            <div className="bg-red-500/10 dark:bg-red-950/20 border border-red-500/20 dark:border-red-500/10 rounded-3xl p-5 flex items-center gap-4 text-red-700 dark:text-red-400 animate-fadeIn">
              <AlertTriangle className="w-8 h-8 flex-shrink-0 text-red-500" />
              <div>
                <h4 className="font-bold text-sm">Escala Bloqueada para Alterações</h4>
                <p className="text-xs text-red-650 dark:text-red-400/80 mt-0.5 leading-relaxed">
                  Esta escala foi finalizada e marcada como completa no painel administrativo. Todas as alterações e remoções foram congeladas. Para editá-la, retorne ao painel e clique no botão de desbloqueio ("Reabrir").
                 </p>
              </div>
            </div>
          )}

          {/* Global Config Card */}
          <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 shadow-sm">
            <h3 className="font-bold text-base text-stone-850 dark:text-white mb-4">Configuração Geral</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-xs font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-2">
                  Data do Sábado da Escala (Selecione no Calendário)
                </label>
                <input
                  type="date"
                  required
                  disabled={finalizada}
                  value={selectedSabado}
                  onChange={(e) => setSelectedSabado(e.target.value)}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  className="w-full px-4 py-2.5 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all cursor-pointer font-semibold disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-2">
                  Período Operacional Calculado
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 px-4 py-2.5 bg-stone-100 dark:bg-stone-950/40 border border-stone-200 dark:border-stone-800 rounded-xl text-xs text-stone-500 dark:text-stone-400 font-semibold select-none">
                    Início: {dataInicio ? formatDate(dataInicio, true) : 'Aguardando Sábado...'}
                  </div>
                  <div className="flex-1 px-4 py-2.5 bg-stone-100 dark:bg-stone-950/40 border border-stone-200 dark:border-stone-800 rounded-xl text-xs text-stone-500 dark:text-stone-400 font-semibold select-none">
                    Fim: {dataFim ? formatDate(dataFim, true) : 'Aguardando Sábado...'}
                  </div>
                </div>
              </div>
            </div>

            {selectedSabado && !finalizada && (
              <div className="mb-6 pb-6 border-b border-stone-200 dark:border-stone-800">
                <label className="block text-xs font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-2">
                  Adicionar Feriado / Dia Especial (Caixa Vazia / Data)
                </label>
                <div className="flex flex-wrap items-end gap-3.5">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">Nome do Dia / Feriado</span>
                    <input
                      type="text"
                      id="custom-day-name"
                      placeholder="Ex: Sexta-feira (Feriado)"
                      className="px-3.5 py-2 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-850 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">Selecione a Data</span>
                    <input
                      type="date"
                      id="custom-day-date"
                      onClick={(e) => e.currentTarget.showPicker?.()}
                      className="px-3.5 py-2 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-855 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-accent font-medium text-stone-800 dark:text-stone-200 cursor-pointer"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const nameInput = document.getElementById('custom-day-name') as HTMLInputElement;
                      const dateInput = document.getElementById('custom-day-date') as HTMLInputElement;
                      if (dateInput && dateInput.value) {
                        const dateStr = dateInput.value;
                        let name = nameInput.value.trim();

                        if (!name) {
                           const dateObj = new Date(dateStr + 'T00:00:00');
                           let dayOfWeekName = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
                           dayOfWeekName = dayOfWeekName.charAt(0).toUpperCase() + dayOfWeekName.slice(1);
                           name = `${dayOfWeekName} (Feriado)`;
                        }
                         
                        const alreadyIn = diasDaSemana.some(d => d.dataStr === dateStr);
                        if (alreadyIn) {
                          alert('Este dia já foi adicionado.');
                          return;
                        }

                        setDiasDaSemana(prev => {
                          const updated = [...prev, { nome: name, dataStr: dateStr }];
                          updated.sort((a, b) => a.dataStr.localeCompare(b.dataStr));
                          return updated;
                        });
                         
                        nameInput.value = '';
                        dateInput.value = '';
                      } else {
                        alert('Por favor, selecione a data do feriado.');
                      }
                    }}
                    className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 dark:bg-stone-950 dark:hover:bg-stone-850 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
                  >
                    + Adicionar Feriado
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-2">
                  Observações
                </label>
                <textarea
                  rows={2}
                  disabled={finalizada}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex: Final de semana de sol, Gutbrau lotada! Foco no atendimento rápido. 🍻"
                  className="w-full px-4 py-2.5 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all resize-none disabled:opacity-60"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  id="escala-pub"
                  type="checkbox"
                  disabled={finalizada}
                  checked={publicada}
                  onChange={(e) => setPublicada(e.target.checked)}
                  className="w-5 h-5 rounded border-stone-300 dark:border-stone-855 text-accent focus:ring-accent cursor-pointer disabled:opacity-50"
                />
                <label htmlFor="escala-pub" className="text-sm font-semibold text-stone-755 dark:text-stone-300 cursor-pointer select-none">
                  Publicar escala (visível para colaboradores)
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  id="escala-cancel-sat"
                  type="checkbox"
                  disabled={finalizada}
                  checked={sabadoCancelado}
                  onChange={(e) => setSabadoCancelado(e.target.checked)}
                  className="w-5 h-5 rounded border-stone-300 dark:border-stone-850 text-red-500 focus:ring-red-500 cursor-pointer disabled:opacity-50"
                />
                <label htmlFor="escala-cancel-sat" className="text-sm font-semibold text-stone-755 dark:text-stone-300 cursor-pointer select-none">
                  Suspender recreação de **Sábado** (ex: chuva/clima)
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  id="escala-cancel-sun"
                  type="checkbox"
                  disabled={finalizada}
                  checked={domingoCancelado}
                  onChange={(e) => setDomingoCancelado(e.target.checked)}
                  className="w-5 h-5 rounded border-stone-300 dark:border-stone-850 text-red-500 focus:ring-red-500 cursor-pointer disabled:opacity-50"
                />
                <label htmlFor="escala-cancel-sun" className="text-sm font-semibold text-stone-755 dark:text-stone-300 cursor-pointer select-none">
                  Suspender recreação de **Domingo** (ex: chuva/clima)
                </label>
              </div>
            </div>
          </div>

          {/* Assistente de Disponibilidade do WhatsApp */}
          {!finalizada && (
            <div className="bg-white dark:bg-stone-900 border border-amber-500/20 dark:border-amber-500/10 rounded-3xl p-6 shadow-sm shadow-amber-500/[0.02]">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setAssistenteAberto(!assistenteAberto)}>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-2xl">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-stone-850 dark:text-white flex items-center gap-2">
                      Assistente de Disponibilidade do WhatsApp
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                      Cole o texto do grupo do WhatsApp para preencher a escala automaticamente
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-850 rounded-xl text-stone-500 transition-all"
                >
                  {assistenteAberto ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>

              {assistenteAberto && (
                <div className="mt-6 pt-6 border-t border-stone-100 dark:border-stone-800/60 space-y-5 animate-fadeIn">
                  <div className="space-y-2">
                    <label htmlFor="avail-textarea" className="block text-xs font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider">
                      Copie e Cole as Disponibilidades
                    </label>
                    <textarea
                      id="avail-textarea"
                      rows={6}
                      value={textoDisponibilidade}
                      onChange={(e) => setTextoDisponibilidade(e.target.value)}
                      placeholder={`Exemplo:\nJordão - sábado e domingo\nRyan - Sabado e Domingo\nAndre Rechia - Sábado e Domingo\nGabriel Winter - Domingo\nLeandro - Domingo\nHeloisa - sábado\nVictor - sábado e domingo`}
                      className="w-full px-4 py-3 bg-stone-50 dark:bg-stone-950 border border-stone-250 dark:border-stone-850 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all font-mono resize-y"
                    />
                  </div>

                  <div className="flex justify-between items-center gap-3">
                    <p className="text-[11px] text-stone-400 dark:text-stone-550 max-w-md font-medium leading-normal">
                      💡 O algoritmo prioriza os colaboradores ativos com mais pontos (Score Interno) nas funções recomendadas (Resgatistas, Caixas e Monitores).
                    </p>
                    <button
                      type="button"
                      onClick={handleAnalyseAvailability}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-amber-500/10 flex-shrink-0"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      Analisar Texto
                    </button>
                  </div>

                  {analiseExecutada && (
                    <div className="space-y-4 pt-4 border-t border-stone-100 dark:border-stone-800/40 animate-fadeIn">
                      <h4 className="font-bold text-xs text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                        Resultado da Análise da Equipe
                      </h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div className="bg-stone-50 dark:bg-stone-950/40 border border-stone-200/60 dark:border-stone-800/60 rounded-2xl p-4 space-y-3 max-h-[220px] overflow-y-auto">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-450 uppercase tracking-wider">Identificados ({resultadosAnalise.filter(r => r.status === 'sucesso').length})</span>
                          </div>
                          {resultadosAnalise.filter(r => r.status === 'sucesso').map((res, i) => (
                            <div key={i} className="flex justify-between items-center text-[11px] font-semibold py-1 border-b border-stone-100 dark:border-stone-900/60 last:border-b-0">
                              <span className="text-stone-800 dark:text-stone-200">{res.colaborador?.nome}</span>
                              <div className="flex gap-1.5">
                                {res.sabado && <span className="px-1.5 py-0.5 bg-accent/10 text-accent rounded text-[9px] font-bold">Sáb</span>}
                                {res.domingo && <span className="px-1.5 py-0.5 bg-accent/10 text-accent rounded text-[9px] font-bold">Dom</span>}
                                <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-450 rounded font-bold text-[9px]">⭐ {res.colaborador?.pontos} pts</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="bg-stone-50 dark:bg-stone-950/40 border border-stone-200/60 dark:border-stone-800/60 rounded-2xl p-4 space-y-3 max-h-[220px] overflow-y-auto">
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-550 uppercase tracking-wider">Alertas / Não Identificados ({resultadosAnalise.filter(r => r.status !== 'sucesso').length})</span>
                          {resultadosAnalise.filter(r => r.status !== 'sucesso').map((res, i) => (
                            <div key={i} className="flex flex-col gap-1 py-1.5 border-b border-stone-100 dark:border-stone-900/60 last:border-b-0 text-[11px]">
                              <div className="flex justify-between items-center font-bold">
                                <span className="text-red-500 dark:text-red-450 font-mono">"{res.nomeOriginal}"</span>
                                <span className="px-1.5 py-0.2 bg-stone-200 text-stone-600 dark:bg-stone-850 dark:text-stone-400 rounded-full font-extrabold text-[8px]">
                                  {res.status === 'ambiguo' ? 'Ambiguidade' : 'Não cadastrado'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-3">
                        <button
                          type="button"
                          onClick={() => {
                            setAnaliseExecutada(false);
                            setTextoDisponibilidade('');
                            setResultadosAnalise([]);
                          }}
                          className="px-4 py-2 bg-stone-150 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300 text-xs font-semibold rounded-xl transition-all"
                        >
                          Limpar
                        </button>
                        <button
                          type="button"
                          onClick={handleApplyAutoSchedule}
                          className="inline-flex items-center gap-1.5 px-5 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition-all"
                        >
                          <Check className="w-4 h-4" />
                          Preencher Escala com Rascunho
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Shifts Builder Accordion/List */}
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-stone-850 dark:text-stone-200 flex items-center gap-2">
              <Clock className="w-5 h-5 text-accent" />
              Distribuição de Turnos por Dia
            </h2>

            {diasDaSemana.length === 0 ? (
              <div className="p-8 text-center text-stone-500 dark:text-stone-400 border border-dashed border-stone-200 dark:border-stone-800 rounded-3xl text-sm">
                Selecione a data de início da semana para estruturar os dias.
              </div>
            ) : (
              <div className="space-y-5">
                {diasDaSemana.map(dia => {
                  const dayItens = itens.map((item, idx) => ({ ...item, globalIndex: idx })).filter(item => item.data === dia.dataStr);
                  const isWeekendDay = dia.nome.toLowerCase().includes('sábado') || dia.nome.toLowerCase().includes('domingo');

                  return (
                    <div 
                      key={dia.dataStr}
                      className={`border rounded-2.5xl overflow-hidden transition-all duration-200 bg-white dark:bg-stone-950 ${
                        isWeekendDay 
                          ? 'border-accent/20 dark:border-accent/10 shadow-sm shadow-accent/[0.01]' 
                          : 'border-stone-200 dark:border-stone-850'
                      }`}
                    >
                      <div className={`px-5 py-3.5 border-b flex justify-between items-center ${
                        isWeekendDay 
                          ? 'bg-accent/[0.02] border-accent/20 dark:border-accent/10'
                          : 'bg-stone-50/50 border-stone-200 dark:bg-stone-900/10 dark:border-stone-850'
                      }`}>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-stone-850 dark:text-stone-100">{dia.nome}</h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400 rounded-full">
                            {dia.dataStr.split('-')[2]}/{dia.dataStr.split('-')[1]}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {!finalizada && (
                            <button
                              type="button"
                              onClick={() => handleAddShift(dia.dataStr)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent hover:bg-accent-hover text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Adicionar Turno
                            </button>
                          )}
                          {!isWeekendDay && !finalizada && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Tem certeza que deseja remover ${dia.nome} da escala? Todos os turnos agendados nele serão excluídos.`)) {
                                  setItens(prev => prev.filter(item => item.data !== dia.dataStr));
                                  setDiasDaSemana(prev => prev.filter(d => d.dataStr !== dia.dataStr));
                                }
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-650 text-xs font-semibold rounded-lg transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Remover Dia
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="p-4 space-y-3">
                        {dayItens.length === 0 ? (
                          <p className="text-center py-4 text-xs text-stone-400 dark:text-stone-500 italic">
                            Nenhum turno agendado para este dia.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {dayItens.map(item => (
                              <div 
                                key={item.globalIndex}
                                className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center p-3 bg-stone-50 dark:bg-stone-900/40 border border-stone-200 dark:border-stone-800 rounded-xl animate-fadeIn"
                              >
                                <div className="sm:col-span-3 flex items-center gap-2">
                                  <User className="w-4 h-4 text-stone-400 flex-shrink-0" />
                                  <select
                                    disabled={finalizada}
                                    value={item.colaborador_id}
                                    onChange={(e) => handleUpdateShift(item.globalIndex, 'colaborador_id', e.target.value)}
                                    className="w-full bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 px-2 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-accent font-medium disabled:opacity-60 text-stone-900 dark:text-stone-100"
                                  >
                                    {colaboradores.map(c => (
                                      <option key={c.id} value={c.id} className="text-stone-900 dark:text-stone-100 bg-white dark:bg-stone-950">{c.nome}</option>
                                    ))}
                                  </select>
                                </div>

                                <div className="sm:col-span-2 flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-stone-400 flex-shrink-0" />
                                  <input
                                    type="text"
                                    required
                                    disabled={finalizada}
                                    value={item.turno}
                                    onChange={(e) => handleUpdateShift(item.globalIndex, 'turno', e.target.value)}
                                    placeholder="Ex: 10:00 - 18:00"
                                    className="w-full bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 px-2 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-accent font-medium disabled:opacity-60 text-stone-900 dark:text-stone-100"
                                    list={`turnos-datalist-${dia.dataStr}`}
                                  />
                                  <datalist id={`turnos-datalist-${dia.dataStr}`}>
                                    {PRESET_TURNOS.map(p => <option key={p} value={p} />)}
                                  </datalist>
                                </div>

                                <div className="sm:col-span-2 flex items-center gap-2">
                                  <Briefcase className="w-4 h-4 text-stone-400 flex-shrink-0" />
                                  <select
                                    disabled={finalizada}
                                    value={item.funcao}
                                    onChange={(e) => handleUpdateShift(item.globalIndex, 'funcao', e.target.value)}
                                    className="w-full bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 px-2 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-accent font-medium disabled:opacity-60 text-stone-900 dark:text-stone-100"
                                  >
                                    <option value="Monitor" className="text-stone-900 dark:text-stone-100 bg-white dark:bg-stone-950">Monitor (Automático)</option>
                                    <option value="Resgatista" className="text-stone-900 dark:text-stone-100 bg-white dark:bg-stone-950">Resgatista (Automático)</option>
                                    <option value="Caixa" className="text-stone-900 dark:text-stone-100 bg-white dark:bg-stone-950">Caixa (Automático)</option>
                                    <option value="Resgatista 1" className="text-stone-900 dark:text-stone-100 bg-white dark:bg-stone-950">Resgatista 1</option>
                                    <option value="Resgatista 2" className="text-stone-900 dark:text-stone-100 bg-white dark:bg-stone-950">Resgatista 2</option>
                                    <option value="Monitor I (Tirolesa)" className="text-stone-900 dark:text-stone-100 bg-white dark:bg-stone-950">Monitor I (Tirolesa)</option>
                                    <option value="Monitor II (Base)" className="text-stone-900 dark:text-stone-100 bg-white dark:bg-stone-950">Monitor II (Base)</option>
                                    <option value="Monitor III (Bike/Caixa)" className="text-stone-900 dark:text-stone-100 bg-white dark:bg-stone-950">Monitor III (Bike/Caixa)</option>
                                  </select>
                                </div>

                                <div className="sm:col-span-2 flex items-center gap-2">
                                  <MessageSquare className="w-4 h-4 text-stone-400 flex-shrink-0" />
                                  <input
                                    type="text"
                                    disabled={finalizada}
                                    value={item.comentario_interno || ''}
                                    onChange={(e) => handleUpdateShift(item.globalIndex, 'comentario_interno', e.target.value)}
                                    placeholder="Obs interna"
                                    className="w-full bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 px-2 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-accent font-medium disabled:opacity-60 text-stone-900 dark:text-stone-100"
                                  />
                                </div>

                                <div className="sm:col-span-3 flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    disabled={finalizada}
                                    onClick={() => handleUpdateShift(item.globalIndex, 'falta', !item.falta)}
                                    className={`px-2 py-1.5 rounded-lg border transition-all text-[9px] font-extrabold uppercase tracking-wider flex items-center justify-center flex-1 sm:flex-initial select-none disabled:opacity-50 ${
                                      item.falta 
                                        ? 'bg-red-500/20 text-red-750 border-red-500/30 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' 
                                        : 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-450 dark:border-emerald-500/20'
                                    }`}
                                    title={item.falta ? "Falta registrada (Dedeuzirá 3 pontos)" : "Presença confirmada"}
                                  >
                                    {item.falta ? 'Falta' : 'Presença'}
                                  </button>
                                  
                                  <button
                                    type="button"
                                    disabled={finalizada}
                                    onClick={() => handleUpdateShift(item.globalIndex, 'treinamento', !item.treinamento)}
                                    className={`px-2 py-1.5 rounded-lg border transition-all text-[9px] font-extrabold uppercase tracking-wider flex items-center justify-center flex-1 sm:flex-initial select-none disabled:opacity-50 ${
                                      item.treinamento 
                                        ? 'bg-amber-500/20 text-amber-700 border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' 
                                        : 'bg-stone-100 text-stone-500 border-stone-200 dark:bg-stone-900 dark:text-stone-400 dark:border-stone-800 hover:bg-stone-200'
                                    }`}
                                  >
                                    Treino
                                  </button>
                                  {!finalizada && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveShift(item.globalIndex)}
                                      className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-650 dark:text-red-400 rounded-lg transition-all flex-shrink-0"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Form Errors */}
          {errorMsg && (
            <div className="text-xs text-red-500 font-semibold flex items-center gap-1.5 bg-red-500/10 p-3.5 rounded-xl border border-red-500/20">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              {errorMsg}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-stone-200 dark:border-stone-850">
            <Link
              href="/admin"
              className="px-5 py-2.5 bg-stone-200 hover:bg-stone-300 dark:bg-stone-900 dark:hover:bg-stone-850 text-stone-800 dark:text-stone-200 text-sm font-semibold rounded-xl transition-all"
            >
              {finalizada ? 'Voltar' : 'Cancelar'}
            </Link>
            {!finalizada && (
              <button
                type="submit"
                disabled={saveLoading}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-xl shadow-md transition-all duration-205 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saveLoading ? 'Salvando Escala...' : 'Salvar Escala Semanal'}
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
