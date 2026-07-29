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
  Briefcase
} from 'lucide-react';
import { db } from '@/lib/db';
import { Colaborador, Escala, EscalaItem } from '@/types/database';

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
  }[]>([]);
  const [saveLoading, setSaveLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Local helper for date list of the week
  const [diasDaSemana, setDiasDaSemana] = useState<{ nome: string; dataStr: string }[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (dataInicio) {
      calculateWeekDays(dataInicio, itens);
    } else {
      setDiasDaSemana([]);
    }
  }, [dataInicio]);

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
          setObservacoes(escala.observacoes || '');
          const mappedItens = escala.itens.map(item => ({
            id: item.id,
            colaborador_id: item.colaborador_id,
            data: item.data,
            turno: item.turno,
            funcao: item.funcao,
          }));
          setItens(mappedItens);
          calculateWeekDays(escala.data_inicio, mappedItens);
        } else {
          router.push('/admin');
        }
      } else {
        // Set default date to upcoming Monday
        const today = new Date();
        const day = today.getDay();
        const diffToMonday = day === 0 ? 1 : 8 - day; // how many days to next monday
        const nextMonday = new Date(today);
        nextMonday.setDate(today.getDate() + diffToMonday);
        const nextMondayStr = nextMonday.toISOString().split('T')[0];
        setDataInicio(nextMondayStr);
      }
    } catch (err) {
      console.error('Erro ao carregar recursos:', err);
    } finally {
      setLoadingResources(false);
    }
  };

  const calculateWeekDays = (mondayStr: string, currentItens = itens) => {
    const monday = new Date(mondayStr + 'T00:00:00');
    
    // Automatically set end date (Sunday)
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    setDataFim(sunday.toISOString().split('T')[0]);

    const days: { nome: string; dataStr: string }[] = [];
    const nomes = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];
    
    // Sábado e Domingo por padrão
    const sat = new Date(monday);
    sat.setDate(monday.getDate() + 5);
    days.push({
      nome: 'Sábado',
      dataStr: sat.toISOString().split('T')[0]
    });

    const sun = new Date(monday);
    sun.setDate(monday.getDate() + 6);
    days.push({
      nome: 'Domingo',
      dataStr: sun.toISOString().split('T')[0]
    });

    // Adiciona outros dias se houver turnos cadastrados neles
    if (currentItens && currentItens.length > 0) {
      const satStr = sat.toISOString().split('T')[0];
      const sunStr = sun.toISOString().split('T')[0];
      
      currentItens.forEach(item => {
        if (item.data !== satStr && item.data !== sunStr) {
          const itemDate = new Date(item.data + 'T00:00:00');
          const diffTime = itemDate.getTime() - monday.getTime();
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays < 5) {
            const alreadyExists = days.some(d => d.dataStr === item.data);
            if (!alreadyExists) {
              days.push({
                nome: nomes[diffDays],
                dataStr: item.data
              });
            }
          }
        }
      });
    }

    days.sort((a, b) => a.dataStr.localeCompare(b.dataStr));
    setDiasDaSemana(days);
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
        funcao: firstCollab.funcao_padrao || 'Monitor'
      }
    ]);
  };

  const handleRemoveShift = (index: number) => {
    setItens(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateShift = (index: number, field: string, value: string) => {
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
        observacoes: observacoes.trim() || undefined
      };

      // Strip temporary details before saving
      const itemsPayload = itens.map(item => ({
        colaborador_id: item.colaborador_id,
        data: item.data,
        turno: item.turno,
        funcao: item.funcao,
      }));

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
          {/* Global Config Card */}
          <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 shadow-sm">
            <h3 className="font-bold text-base text-stone-800 dark:text-white mb-4">Configuração Geral</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-xs font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-2">
                  Início da Semana (Segunda-feira)
                </label>
                <input
                  type="date"
                  required
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-2">
                  Fim da Semana (Domingo automático)
                </label>
                <input
                  type="date"
                  disabled
                  value={dataFim}
                  className="w-full px-4 py-2.5 bg-stone-100 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-sm text-stone-500 dark:text-stone-400 cursor-not-allowed"
                />
              </div>
            </div>

            {dataInicio && (
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
                      className="px-3.5 py-2 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-850 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-accent font-medium text-stone-800 dark:text-stone-200"
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
                          // Calculate default weekday name (e.g. "Sexta-feira (Feriado)")
                          const dateObj = new Date(dateStr + 'T00:00:00');
                          let dayOfWeekName = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
                          dayOfWeekName = dayOfWeekName.charAt(0).toUpperCase() + dayOfWeekName.slice(1);
                          name = `${dayOfWeekName} (Feriado)`;
                        }
                        
                        // Check if already in the list
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
                  Observações / Avisos
                </label>
                <textarea
                  rows={2}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex: Final de semana de sol, Gutbrau lotada! Foco no atendimento rápido. 🍻"
                  className="w-full px-4 py-2.5 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all resize-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  id="escala-pub"
                  type="checkbox"
                  checked={publicada}
                  onChange={(e) => setPublicada(e.target.checked)}
                  className="w-5 h-5 rounded border-stone-300 dark:border-stone-850 text-accent focus:ring-accent cursor-pointer"
                />
                <label htmlFor="escala-pub" className="text-sm font-semibold text-stone-755 dark:text-stone-300 cursor-pointer select-none">
                  Publicar escala (visível para colaboradores)
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  id="escala-cancel-sat"
                  type="checkbox"
                  checked={sabadoCancelado}
                  onChange={(e) => setSabadoCancelado(e.target.checked)}
                  className="w-5 h-5 rounded border-stone-300 dark:border-stone-850 text-red-500 focus:ring-red-500 cursor-pointer"
                />
                <label htmlFor="escala-cancel-sat" className="text-sm font-semibold text-stone-755 dark:text-stone-300 cursor-pointer select-none">
                  Suspender recreação de **Sábado** (ex: chuva/clima)
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  id="escala-cancel-sun"
                  type="checkbox"
                  checked={domingoCancelado}
                  onChange={(e) => setDomingoCancelado(e.target.checked)}
                  className="w-5 h-5 rounded border-stone-300 dark:border-stone-850 text-red-500 focus:ring-red-500 cursor-pointer"
                />
                <label htmlFor="escala-cancel-sun" className="text-sm font-semibold text-stone-755 dark:text-stone-300 cursor-pointer select-none">
                  Suspender recreação de **Domingo** (ex: chuva/clima)
                </label>
              </div>
            </div>
          </div>

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
                  // Filter items for this specific date
                  const dayItens = itens.map((item, idx) => ({ ...item, globalIndex: idx })).filter(item => item.data === dia.dataStr);
                  
                  // Check if it is a weekend day (focus days)
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
                      {/* Day Header */}
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
                          <button
                            type="button"
                            onClick={() => handleAddShift(dia.dataStr)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent hover:bg-accent-hover text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Adicionar Turno
                          </button>
                          
                          {!isWeekendDay && (
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

                      {/* Day Shifts */}
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
                                {/* Colaborador Dropdown */}
                                <div className="sm:col-span-4 flex items-center gap-2">
                                  <User className="w-4 h-4 text-stone-400 flex-shrink-0" />
                                  <select
                                    value={item.colaborador_id}
                                    onChange={(e) => handleUpdateShift(item.globalIndex, 'colaborador_id', e.target.value)}
                                    className="w-full bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-accent font-medium"
                                  >
                                    {colaboradores.map(c => (
                                      <option key={c.id} value={c.id}>{c.nome}</option>
                                    ))}
                                  </select>
                                </div>

                                {/* Shift Time */}
                                <div className="sm:col-span-4 flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-stone-400 flex-shrink-0" />
                                  <input
                                    type="text"
                                    required
                                    value={item.turno}
                                    onChange={(e) => handleUpdateShift(item.globalIndex, 'turno', e.target.value)}
                                    placeholder="Ex: 10:00 - 18:00"
                                    className="w-full bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-accent font-medium"
                                    list={`turnos-datalist-${dia.dataStr}`}
                                  />
                                  <datalist id={`turnos-datalist-${dia.dataStr}`}>
                                    {PRESET_TURNOS.map(p => <option key={p} value={p} />)}
                                  </datalist>
                                </div>

                                {/* Role Override */}
                                <div className="sm:col-span-3 flex items-center gap-2">
                                  <Briefcase className="w-4 h-4 text-stone-400 flex-shrink-0" />
                                  <input
                                    type="text"
                                    required
                                    value={item.funcao}
                                    onChange={(e) => handleUpdateShift(item.globalIndex, 'funcao', e.target.value)}
                                    placeholder="Ex: Caixa"
                                    className="w-full bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-accent font-medium"
                                  />
                                </div>

                                {/* Delete Shift */}
                                <div className="sm:col-span-1 flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveShift(item.globalIndex)}
                                    className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-650 dark:text-red-400 rounded-lg transition-all"
                                    title="Remover turno"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
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
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saveLoading}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-xl shadow-md transition-all duration-205 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saveLoading ? 'Salvando Escala...' : 'Salvar Escala Semanal'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
