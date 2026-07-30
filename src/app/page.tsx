'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Calendar, 
  Clock, 
  User, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle, 
  Lock, 
  Info,
  CalendarDays,
  ShieldCheck,
  ClipboardList,
  AlertCircle,
  FileText,
  Printer,
  X,
  CheckCircle,
  CloudRain,
  Search,
  Share2,
  FileSpreadsheet
} from 'lucide-react';
import { db } from '@/lib/db';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Escala, EscalaWithItens } from '@/types/database';
import { formatDate, getDayName, getMonthName, getDisplayFuncao } from '@/lib/utils';
import ShareWhatsApp from '@/components/ShareWhatsApp';

export default function CollaboratorPage() {
  // Type interfaces for the monthly report
  interface ShiftDetail {
    data: string;
    funcao: string;
    turno: string;
  }

  interface ReportColaborador {
    id: string;
    nome: string;
    funcao_padrao: string;
    diasTrabalhados: ShiftDetail[];
    diasCancelados: ShiftDetail[];
  }

  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportColaborador[]>([]);
  const [reportSummary, setReportSummary] = useState({ totalShifts: 0, totalWorked: 0, totalCancelled: 0 });
  const [reportSearchQuery, setReportSearchQuery] = useState('');

  const [escalaAtiva, setEscalaAtiva] = useState<EscalaWithItens | null>(null);
  const [historicoEscalas, setHistoricoEscalas] = useState<Escala[]>([]);
  const [selectedHistEscala, setSelectedHistEscala] = useState<EscalaWithItens | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingHistDetail, setLoadingHistDetail] = useState<string | null>(null);
  const [expandedEscalaId, setExpandedEscalaId] = useState<string | null>(null);
  const [filtroMes, setFiltroMes] = useState<string>(''); // YYYY-MM
  const [isDemoMode, setIsDemoMode] = useState(false);

  const handleGenerateReport = async () => {
    if (!filtroMes) {
      alert("Por favor, selecione um mês no filtro de histórico antes de gerar o relatório!");
      return;
    }

    setReportLoading(true);
    setIsReportOpen(true);
    setReportSearchQuery('');

    try {
      const [year, month] = filtroMes.split('-');
      const monthScales = historicoEscalas.filter(escala => {
        const scaleDate = new Date(escala.data_inicio + 'T00:00:00');
        return scaleDate.getFullYear() === parseInt(year) && (scaleDate.getMonth() + 1) === parseInt(month);
      });

      if (monthScales.length === 0) {
        setReportData([]);
        setReportSummary({ totalShifts: 0, totalWorked: 0, totalCancelled: 0 });
        setReportLoading(false);
        return;
      }

      // Fetch details for all scales of this month
      const detailedScales = await Promise.all(
        monthScales.map(async (escala) => {
          const full = await db.getEscalaById(escala.id);
          return full;
        })
      );

      const collabStats: { [collabId: string]: ReportColaborador } = {};
      const uniqueScheduledDates = new Set<string>();
      const uniqueWorkedDates = new Set<string>();
      const uniqueCancelledDates = new Set<string>();

      detailedScales.forEach((escala) => {
        if (!escala) return;
        escala.itens.forEach((item) => {
          if (!item.colaborador) return;
          const collabId = item.colaborador_id;
          const collabName = item.colaborador.nome;
          const defaultRole = item.colaborador.funcao_padrao;

          const dateStr = item.data;
          uniqueScheduledDates.add(dateStr);

          const dateObj = new Date(dateStr + 'T00:00:00');
          const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday
          const isSat = dayOfWeek === 6;
          const isSun = dayOfWeek === 0;
          const isDayCancelled = (isSat && escala.sabado_cancelado) || (isSun && escala.domingo_cancelado);

          if (isDayCancelled) {
            uniqueCancelledDates.add(dateStr);
          } else {
            uniqueWorkedDates.add(dateStr);
          }

          if (!collabStats[collabId]) {
            collabStats[collabId] = {
              id: collabId,
              nome: collabName,
              funcao_padrao: defaultRole,
              diasTrabalhados: [],
              diasCancelados: [],
            };
          }

          const shiftDetail = {
            data: item.data,
            funcao: item.funcao,
            turno: item.turno
          };

          if (isDayCancelled) {
            collabStats[collabId].diasCancelados.push(shiftDetail);
          } else {
            collabStats[collabId].diasTrabalhados.push(shiftDetail);
          }
        });
      });

      const sortedCollabs = Object.values(collabStats).sort((a, b) => a.nome.localeCompare(b.nome));

      setReportData(sortedCollabs);
      setReportSummary({ 
        totalShifts: uniqueScheduledDates.size, 
        totalWorked: uniqueWorkedDates.size, 
        totalCancelled: uniqueCancelledDates.size 
      });
    } catch (err) {
      console.error('Erro ao gerar relatório mensal:', err);
      alert('Falha ao gerar o relatório.');
      setIsReportOpen(false);
    } finally {
      setReportLoading(false);
    }
  };

  const handleCopyReportToClipboard = () => {
    if (reportData.length === 0) return;

    let text = `📊 *Relatório Mensal de Escalas - GutBrau (${getMonthName(filtroMes + '-01')})* 📊\n\n`;
    text += `📈 *Resumo Geral:*\n`;
    text += `• Total de escalas: ${reportSummary.totalShifts}\n`;
    text += `• Total de dias trabalhados: ${reportSummary.totalWorked}\n`;
    text += `• Total de dias cancelados: ${reportSummary.totalCancelled}\n\n`;
    text += `👥 *Participação dos Colaboradores:*\n`;

    reportData.forEach((c) => {
      const total = c.diasTrabalhados.length + c.diasCancelados.length;
      text += `\n👤 *${c.nome}* (${c.funcao_padrao})\n`;
      text += `   • Efetivo: ${c.diasTrabalhados.length} dia(s)\n`;
      text += `   • Clima/Suspenso: ${c.diasCancelados.length} dia(s)\n`;
      text += `   • Total Escalado: ${total} vez(es)\n`;
      if (c.diasTrabalhados.length > 0) {
        text += `   • Datas Trab: ${c.diasTrabalhados.map(d => formatDate(d.data, true)).join(', ')}\n`;
      }
      if (c.diasCancelados.length > 0) {
        text += `   • Datas Susp: ${c.diasCancelados.map(d => formatDate(d.data, true)).join(', ')}\n`;
      }
    });

    navigator.clipboard.writeText(text);
    alert('Relatório copiado para a área de transferência! Cole no grupo do WhatsApp.');
  };

  useEffect(() => {
    setIsDemoMode(!isSupabaseConfigured);
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const ativa = await db.getEscalaAtiva();
      setEscalaAtiva(ativa);

      const todas = await db.getEscalas();
      setHistoricoEscalas(todas);
      
      // Auto-set the filter to current month
      const today = new Date();
      const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      setFiltroMes(currentMonth);
    } catch (error) {
      console.error('Erro ao carregar escalas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEscala = async (escalaId: string) => {
    if (expandedEscalaId === escalaId) {
      setExpandedEscalaId(null);
      setSelectedHistEscala(null);
      return;
    }

    try {
      setLoadingHistDetail(escalaId);
      setExpandedEscalaId(escalaId);
      const detail = await db.getEscalaById(escalaId);
      setSelectedHistEscala(detail);
    } catch (error) {
      console.error('Erro ao carregar detalhes da escala histórica:', error);
      setExpandedEscalaId(null);
    } finally {
      setLoadingHistDetail(null);
    }
  };

  const renderScaleDays = (escala: EscalaWithItens) => {
    const itemsByDate: { [date: string]: typeof escala.itens } = {};
    escala.itens.forEach(item => {
      if (!itemsByDate[item.data]) {
        itemsByDate[item.data] = [];
      }
      itemsByDate[item.data].push(item);
    });

    const sortedDates = Object.keys(itemsByDate).sort();

    if (sortedDates.length === 0) {
      return (
        <div className="text-center py-8 text-stone-500 dark:text-stone-400">
          Nenhum turno configurado para esta escala.
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sortedDates.map(dateStr => {
          const dayName = getDayName(dateStr);
          const dateFormatted = formatDate(dateStr);
          const isWeekendDay = dayName.toLowerCase().includes('sábado') || dayName.toLowerCase().includes('domingo');
          
          const dateObj = new Date(dateStr + 'T00:00:00');
          const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday
          const isSat = dayOfWeek === 6;
          const isSun = dayOfWeek === 0;
          const isDayCancelled = (isSat && escala.sabado_cancelado) || (isSun && escala.domingo_cancelado);

          return (
            <div 
              key={dateStr}
              className={`p-5 rounded-2xl border transition-all duration-200 ${
                isDayCancelled
                  ? 'bg-red-500/[0.02] border-red-500/15 opacity-55 saturate-50 select-none'
                  : isWeekendDay 
                    ? 'bg-accent/[0.03] border-accent/25 dark:bg-accent/[0.02] dark:border-accent/15'
                    : 'bg-stone-500/[0.02] border-stone-200 dark:bg-stone-850/10 dark:border-stone-850'
              }`}
            >
              <div className="flex justify-between items-center mb-4 border-b border-stone-250 dark:border-stone-850 pb-2">
                <h4 className="font-bold text-base flex items-center gap-2 text-primary dark:text-accent">
                  <CalendarDays className="w-5.5 h-5.5 text-accent" />
                  <span>{dayName}</span>
                </h4>
                {isDayCancelled ? (
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-red-500/15 text-red-650 border border-red-500/20">
                    Cancelada
                  </span>
                ) : (
                  <span className="text-2xs px-2.5 py-1 bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-850 rounded-full font-bold text-stone-600 dark:text-stone-400">
                    {dateFormatted}
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {itemsByDate[dateStr].map(item => (
                  <div 
                    key={item.id}
                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 p-3.5 bg-white dark:bg-stone-950 border border-stone-150 dark:border-stone-850 rounded-xl hover:shadow-sm transition-shadow duration-150"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8.5 h-8.5 rounded-full bg-primary/10 dark:bg-stone-900 border border-primary/20 dark:border-stone-800 flex items-center justify-center text-primary dark:text-accent font-bold text-sm flex-shrink-0">
                        {item.colaborador?.nome.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-stone-850 dark:text-stone-200">
                          {item.colaborador?.nome}{item.treinamento ? '***' : ''}
                        </p>
                        <p className="text-xs text-accent font-semibold">
                          {getDisplayFuncao(item.funcao, item.colaborador_id, itemsByDate[dateStr])}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-2xs bg-stone-50 dark:bg-stone-900 text-stone-600 dark:text-stone-400 px-2 py-0.5 rounded-md border border-stone-200/50 dark:border-stone-800 self-start sm:self-auto flex-shrink-0">
                      <Clock className="w-3 h-3 text-accent" />
                      <span>{item.turno}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const filteredHistory = historicoEscalas.filter(escala => {
    if (!filtroMes) return true;
    const [year, month] = filtroMes.split('-');
    const scaleDate = new Date(escala.data_inicio + 'T00:00:00');
    return (
      scaleDate.getFullYear() === parseInt(year) &&
      scaleDate.getMonth() + 1 === parseInt(month)
    );
  });

  const filteredReportData = reportData.filter(c => 
    c.nome.toLowerCase().includes(reportSearchQuery.toLowerCase()) ||
    c.funcao_padrao.toLowerCase().includes(reportSearchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      
      {/* Top Navbar */}
      <nav className="w-full bg-card-bg dark:bg-stone-900 border-b border-card-border dark:border-stone-800 px-4 sm:px-6 py-2.5 sm:py-3.5 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          {/* Logo Original da Cervejaria GutBrau */}
          <img 
            src="/logo_ext_verde.png" 
            alt="GutBrau Cervejaria" 
            className="h-8 sm:h-11 w-auto object-contain dark:brightness-0 dark:invert" 
          />
          <span className="text-[9px] sm:text-3xs font-extrabold uppercase tracking-widest px-1.5 py-0.5 sm:px-2 bg-accent/10 text-accent rounded-md border border-accent/20 ml-1.5">
            Arvorismo
          </span>
        </div>
        <Link 
          href="/admin"
          className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-4 sm:py-2 bg-accent hover:bg-accent-hover text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-200 shadow-md shadow-accent/20 flex-shrink-0"
        >
          <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          Painel Admin
        </Link>
      </nav>

      {/* Hero Header with Real GutBrau Background */}
      <div 
        className="w-full py-20 relative flex items-center justify-center text-center px-4 overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: "url('/gutbrau_ambiente.jpg')" }}
      >
        {/* Dark Forest Green Tint Overlay for High Text Readability and Brand Cohesion */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/95 via-primary/85 to-stone-950/95 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(189,162,105,0.15),transparent_60%)]"></div>
        
        <div className="relative space-y-3.5 z-10">
          <h1 className="text-3.5xl sm:text-5xl font-serif font-extrabold text-accent tracking-wider drop-shadow-md">
            ESCALA DE TRABALHO
          </h1>
          <p className="text-xs sm:text-sm font-bold tracking-widest text-stone-200 uppercase max-w-xl mx-auto border-y border-accent/30 py-2.5 backdrop-blur-3xs bg-primary/20">
            Recreação e Esportes de Aventura — Arvorismo
          </p>
          <div className="pt-2 text-3xs text-stone-300 font-bold uppercase tracking-widest flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
            Unidade Vila Nova — Estrada Motucas, Joinville
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full max-w-6xl mx-auto px-4 py-8">
        
        {/* Demo Banner */}
        {isDemoMode && (
          <div className="mb-8 p-4 bg-accent/10 border border-accent/20 text-accent rounded-2xl flex items-start gap-3 text-xs">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Modo de Demonstração Local:</span> O banco Supabase não está configurado. Os dados estão sendo lidos/salvos no seu navegador (`localStorage`). Edite o arquivo `.env.local` com suas chaves para conectar.
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT: Schedules (8 Cols) */}
          <div className="lg:col-span-8 space-y-12">
            
            {/* Active Weekend Scale Section */}
            <section className="space-y-6">
              <h2 className="text-xl font-extrabold text-stone-850 dark:text-stone-150 flex items-center gap-2.5 pb-2 border-b border-stone-200 dark:border-stone-850">
                <CalendarDays className="w-5.5 h-5.5 text-accent" />
                Escala do Fim de Semana
              </h2>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-10 h-10 border-3 border-accent/20 border-t-accent rounded-full animate-spin"></div>
                  <p className="text-stone-500 dark:text-stone-400 text-xs font-semibold">Carregando turnos...</p>
                </div>
              ) : escalaAtiva ? (
                <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 shadow-sm overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-36 h-36 bg-accent/5 rounded-full blur-3xl pointer-events-none"></div>
                  
                  {escalaAtiva.sabado_cancelado && escalaAtiva.domingo_cancelado && (
                    <div className="mb-6 p-4.5 bg-red-500/10 border border-red-500/20 text-red-705 dark:text-red-400 rounded-2xl flex items-start gap-3 text-xs font-semibold">
                      <AlertCircle className="w-5.5 h-5.5 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block text-sm mb-1 uppercase tracking-wide">Escala Suspensa (Fim de Semana Completo)</span>
                        Por conta de condições climáticas adversas ou motivos operacionais, a recreação do arvorismo de sábado e domingo foi suspensa. Aguarde orientações no grupo do WhatsApp.
                      </div>
                    </div>
                  )}

                  {escalaAtiva.sabado_cancelado && !escalaAtiva.domingo_cancelado && (
                    <div className="mb-6 p-4.5 bg-red-500/10 border border-red-500/20 text-red-705 dark:text-red-400 rounded-2xl flex items-start gap-3 text-xs font-semibold">
                      <AlertCircle className="w-5.5 h-5.5 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block text-sm mb-1 uppercase tracking-wide">Operação Suspensa no Sábado</span>
                        A recreação de arvorismo foi suspensa para este **Sábado** devido à previsão climática ou motivos operacionais. A escala de **Domingo segue mantida normalmente**.
                      </div>
                    </div>
                  )}

                  {!escalaAtiva.sabado_cancelado && escalaAtiva.domingo_cancelado && (
                    <div className="mb-6 p-4.5 bg-red-500/10 border border-red-500/20 text-red-705 dark:text-red-400 rounded-2xl flex items-start gap-3 text-xs font-semibold">
                      <AlertCircle className="w-5.5 h-5.5 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block text-sm mb-1 uppercase tracking-wide">Operação Suspensa no Domingo</span>
                        A recreação de arvorismo está confirmada para **Sábado**, mas suspensa para este **Domingo** devido ao clima ou motivos de força maior.
                      </div>
                    </div>
                  )}

                  <div>
                    {renderScaleDays(escalaAtiva)}
                  </div>

                  {escalaAtiva.observacoes && (
                    <div className="mt-6 p-4 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-850 rounded-2xl flex gap-3 text-sm text-stone-700 dark:text-stone-300">
                      <Info className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-stone-850 dark:text-stone-200 mb-0.5">Comunicado Geral:</p>
                        <p className="italic text-xs">{escalaAtiva.observacoes}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-10 text-center space-y-4">
                  <Calendar className="w-12 h-12 text-stone-400 mx-auto" />
                  <h3 className="font-bold text-stone-800 dark:text-stone-200">Nenhuma escala ativa publicada</h3>
                  <p className="text-stone-500 dark:text-stone-400 max-w-sm mx-auto text-xs">
                    As escalas para o arvorismo deste final de semana ainda não foram publicadas.
                  </p>
                </div>
              )}
            </section>

            {/* Monthly History Section */}
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-200 dark:border-stone-850">
                <h2 className="text-xl font-extrabold text-stone-850 dark:text-stone-150 flex items-center gap-2.5">
                  <Calendar className="w-5.5 h-5.5 text-accent" />
                  Histórico de Escalas
                </h2>
                
                <div className="flex items-center gap-2">
                  <label htmlFor="filtro-mes" className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">
                    Mês:
                  </label>
                  <input 
                    id="filtro-mes"
                    type="month"
                    value={filtroMes}
                    onChange={(e) => setFiltroMes(e.target.value)}
                    className="px-3 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-accent font-bold"
                  />
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="w-6 h-6 border-2 border-accent/20 border-t-accent rounded-full animate-spin"></div>
                </div>
              ) : filteredHistory.length > 0 ? (
                <div className="space-y-3">
                  {filteredHistory.map(escala => {
                    const isExpanded = expandedEscalaId === escala.id;
                    const isCurLoading = loadingHistDetail === escala.id;
                    
                    return (
                      <div 
                        key={escala.id}
                        className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 overflow-hidden transition-all duration-200"
                      >
                        <button
                          onClick={() => handleToggleEscala(escala.id)}
                          className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-4.5 hover:bg-stone-50 dark:hover:bg-stone-950/40 transition-colors duration-150 text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl flex-shrink-0 ${escala.publicada ? 'bg-primary/10 text-primary dark:text-accent' : 'bg-stone-100 text-stone-400 dark:bg-stone-950'}`}>
                              <CalendarDays className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-bold text-xs sm:text-sm text-stone-850 dark:text-stone-100">
                                Escala de {formatDate(escala.data_inicio, true)} a {formatDate(escala.data_fim, true)}
                              </p>
                              <p className="text-3xs text-stone-500 dark:text-stone-400 font-semibold uppercase tracking-wider mt-0.5">
                                Publicada em {escala.created_at ? new Date(escala.created_at).toLocaleDateString('pt-BR') : 'Desconhecido'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pl-11 sm:pl-0">
                            {escala.sabado_cancelado && escala.domingo_cancelado ? (
                              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-red-500/10 text-red-700 border border-red-500/20">
                                Cancelada
                              </span>
                            ) : escala.sabado_cancelado || escala.domingo_cancelado ? (
                              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-amber-500/10 text-amber-700 dark:text-accent border border-amber-500/20">
                                Cancel. Parcial
                              </span>
                            ) : (
                              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-primary/10 text-primary dark:text-accent border border-primary/20 dark:border-stone-800">
                                Publicada
                              </span>
                            )}
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-stone-400 flex-shrink-0" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-stone-400 flex-shrink-0" />
                            )}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-stone-200 dark:border-stone-800 p-5 bg-stone-50/50 dark:bg-stone-950/20">
                            {isCurLoading ? (
                              <div className="flex justify-center items-center py-8">
                                <div className="w-6 h-6 border-2 border-accent/20 border-t-accent rounded-full animate-spin"></div>
                              </div>
                            ) : selectedHistEscala ? (
                              <div className="space-y-4">
                                {selectedHistEscala.sabado_cancelado && selectedHistEscala.domingo_cancelado && (
                                  <div className="p-3.5 bg-red-500/5 border border-red-500/20 text-red-700 dark:text-red-400 rounded-xl flex items-start gap-2.5 text-xs font-semibold">
                                    <AlertCircle className="w-4.5 h-4.5 flex-shrink-0" />
                                    <span>Escala de Sábado e Domingo cancelada por condições climáticas ou motivos operacionais.</span>
                                  </div>
                                )}
                                {selectedHistEscala.sabado_cancelado && !selectedHistEscala.domingo_cancelado && (
                                  <div className="p-3.5 bg-red-500/5 border border-red-500/20 text-red-700 dark:text-red-400 rounded-xl flex items-start gap-2.5 text-xs font-semibold">
                                    <AlertCircle className="w-4.5 h-4.5 flex-shrink-0" />
                                    <span>Operação cancelada para o Sábado. Turnos de Domingo seguem mantidos.</span>
                                  </div>
                                )}
                                {!selectedHistEscala.sabado_cancelado && selectedHistEscala.domingo_cancelado && (
                                  <div className="p-3.5 bg-red-500/5 border border-red-500/20 text-red-700 dark:text-red-400 rounded-xl flex items-start gap-2.5 text-xs font-semibold">
                                    <AlertCircle className="w-4.5 h-4.5 flex-shrink-0" />
                                    <span>Operação mantida para o Sábado, mas cancelada para o Domingo.</span>
                                  </div>
                                )}
                                <div>
                                  {renderScaleDays(selectedHistEscala)}
                                </div>
                                {selectedHistEscala.observacoes && (
                                  <div className="mt-4 p-3.5 bg-stone-100/50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 rounded-xl text-xs italic text-stone-600 dark:text-stone-400">
                                    Observações: {selectedHistEscala.observacoes}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-center text-xs text-red-500">Falha ao carregar detalhes.</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-stone-50 dark:bg-stone-900/10 border border-stone-200/50 dark:border-stone-800/50 rounded-2xl p-8 text-center text-stone-500 dark:text-stone-400 text-xs italic">
                  Nenhuma escala de arvorismo encontrada para o mês selecionado ({filtroMes ? getMonthName(filtroMes + '-01') : 'Sem filtro'}).
                </div>
              )}

              {filteredHistory.length > 0 && (
                <div className="mt-6 pt-4 border-t border-stone-200 dark:border-stone-850 flex justify-end print:hidden">
                  <button
                    onClick={handleGenerateReport}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-200 shadow-md shadow-accent/20 cursor-pointer hover:shadow-lg active:scale-98"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Gerar Relatório do Mês
                  </button>
                </div>
              )}
            </section>
          </div>

          {/* RIGHT: Arvorismo / Recreação Checklist Sidebar (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Safety Guidelines Card */}
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-5 space-y-4 shadow-sm">
              <h3 className="font-serif text-base font-bold text-primary dark:text-accent pb-2 border-b border-stone-200 dark:border-stone-800 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-accent" />
                Segurança Arvorismo
              </h3>
              
              <div className="space-y-4 text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                <p>
                  As atividades de recreação de aventura ocorrem sob rigorosas diretrizes de segurança física. Todos os colaboradores devem seguir as verificações antes de cada jornada.
                </p>
                <div className="p-3 bg-stone-50 dark:bg-stone-950 rounded-xl border border-stone-200 dark:border-stone-850">
                  <p className="font-bold text-stone-800 dark:text-stone-250 mb-1 flex items-center gap-1">
                    <ClipboardList className="w-3.5 h-3.5 text-accent" />
                    Checklist de EPI
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-3xs">
                    <li>Verificar fivelas e costuras de cadeirinhas.</li>
                    <li>Inspecionar mosquetões e freios de tirolesa.</li>
                    <li>Ajustar capacetes dos clientes e equipe.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Weather / Operational Conditions Card */}
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-5 space-y-4 shadow-sm">
              <h3 className="font-serif text-base font-bold text-primary dark:text-accent pb-2 border-b border-stone-200 dark:border-stone-800 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-accent" />
                Condições de Operação
              </h3>
              
              <div className="space-y-4 text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="w-1.5 h-1.5 bg-accent rounded-full mt-1.5 flex-shrink-0"></div>
                    <p><strong>Clima:</strong> Quando o dia amanhece ensolarado é certeza que a recreação irá funcionar. Se amanhecer com o dia nublado, ou com fortes chances de chuva, aguardar orientações no grupo do WhatsApp.</p>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-1.5 h-1.5 bg-accent rounded-full mt-1.5 flex-shrink-0"></div>
                    <p><strong>Horário de Início:</strong> As atividades de arvorismo começam pontualmente às <strong>10:00</strong>.</p>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-1.5 h-1.5 bg-accent rounded-full mt-1.5 flex-shrink-0"></div>
                    <p><strong>Ancoragens & EPIs:</strong> O ponto bate às <strong>10:00</strong>. A partir deste horário, iniciam-se os ajustes gerais, checagem visual e tensionamento de cabos de segurança.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Landscape Ambient Image Card */}
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl overflow-hidden shadow-sm relative transition-all duration-300 hover:shadow-md">
              <div 
                className="w-full h-36 bg-cover bg-center bg-no-repeat filter brightness-95"
                style={{ backgroundImage: "url('/chopp_gutbrau_1785342662911.png')" }}
              ></div>
              <div className="p-4 bg-stone-50/50 dark:bg-stone-900/50">
                <p className="text-3xs text-stone-500 dark:text-stone-400 text-center leading-relaxed">
                  Ambiente familiar integrado à natureza do parque GutBrau Vila Nova.
                </p>
              </div>
            </div>

            {/* Rescue Preparedness Info */}
            <div className="bg-accent/10 border border-accent/25 rounded-3xl p-5 text-center space-y-2">
              <AlertCircle className="w-6 h-6 text-accent mx-auto" />
              <h4 className="font-serif text-sm font-bold text-accent">Alerta de Resgate</h4>
              <p className="text-3xs text-stone-700 dark:text-stone-300 leading-relaxed">
                O monitor escalado na função de **Monitor de Resgate** deve estar devidamente equipado e posicionado com o kit de resgate em altura acessível a qualquer momento.
              </p>
            </div>

          </div>

        </div>

      </div>

      {/* Monthly Report Modal overlay */}
      {isReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-md transition-all duration-300 animate-fadeIn print:absolute print:inset-0 print:bg-white print:p-0 print:backdrop-blur-none">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-850 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col relative overflow-hidden animate-scaleIn print:border-none print:shadow-none print:max-h-none print:w-full print:overflow-visible">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-stone-200 dark:border-stone-800 flex justify-between items-center bg-stone-50/50 dark:bg-stone-900/50 print:border-b-2 print:border-black print:pb-4">
              <div className="flex items-center gap-3">
                <svg className="w-8 h-8 text-accent fill-current print:text-black" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C11.3 3.5 9.8 5 8 5.8 7 6.2 5.8 6.2 4.8 5.8c.8 1.5 2.2 2.7 4.2 3.2.7.2 1.3.6 1.8 1.2-.5 1.1-1.3 2.1-2.7 2.8-1 .5-2.2.6-3.2.2.8 1.5 2.2 2.7 4.2 3.2 1.5.4 2.7 1.8 3.2 3.3.5-1.5 1.7-2.9 3.2-3.3 2-.5 3.4-1.7 4.2-3.2-1 .4-2.2.3-3.2-.2-1.4-.7-2.2-1.7-2.7-2.8.5-.6 1.1-1 1.8-1.2 2-.5 3.4-1.7 4.2-3.2-1 .4-2.2.4-3.2 0-1.8-.8-3.3-2.3-4-3.8zm0 7c.5.8 1.2 1.5 2.2 2 .8.4 1.8.5 2.8.2-.5.8-1.3 1.5-2.5 1.8-1.2.3-2 1.2-2.5 2.3-.5-1.1-1.3-2-2.5-2.3-1.2-.3-2-1-2.5-1.8 1 .3 2 .2 2.8-.2 1-.5 1.7-1.2 2.2-2z"/>
                </svg>
                <div>
                  <h3 className="font-serif text-lg sm:text-xl font-extrabold text-stone-900 dark:text-white print:text-black">
                    Relatório de Escalas
                  </h3>
                  <p className="text-3xs sm:text-2xs text-stone-500 dark:text-stone-400 font-bold uppercase tracking-wider print:text-stone-700">
                    Mês de Referência: {filtroMes ? getMonthName(filtroMes + '-01') : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsReportOpen(false)}
                className="p-2 hover:bg-stone-250 dark:hover:bg-stone-800 rounded-full text-stone-450 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors print:hidden"
                title="Fechar relatório"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 print:overflow-visible">
              {reportLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="w-10 h-10 border-3 border-accent/20 border-t-accent rounded-full animate-spin"></div>
                  <p className="text-stone-500 dark:text-stone-400 text-xs font-semibold">Processando dados e compilando turnos...</p>
                </div>
              ) : reportData.length === 0 ? (
                <div className="text-center py-12 text-stone-500 dark:text-stone-400 italic text-xs">
                  Nenhum dado encontrado para o mês selecionado.
                </div>
              ) : (
                <>
                  {/* Summary Cards Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-4 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-850 rounded-2xl text-center">
                      <p className="text-3xs text-stone-500 dark:text-stone-400 font-bold uppercase tracking-wider">Total de escalas</p>
                      <p className="text-xl sm:text-2xl font-extrabold text-stone-900 dark:text-white mt-1">{reportSummary.totalShifts}</p>
                    </div>
                    <div className="p-4 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center">
                      <p className="text-3xs text-emerald-600 dark:text-emerald-450 font-bold uppercase tracking-wider font-semibold">Total de dias trabalhados</p>
                      <p className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{reportSummary.totalWorked}</p>
                    </div>
                    <div className="p-4 bg-red-500/5 dark:bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
                      <p className="text-3xs text-red-600 dark:text-red-450 font-bold uppercase tracking-wider font-semibold">Total de dias cancelados</p>
                      <p className="text-xl sm:text-2xl font-extrabold text-red-600 dark:text-red-400 mt-1">{reportSummary.totalCancelled}</p>
                    </div>
                  </div>

                  {/* Search box */}
                  <div className="relative print:hidden">
                    <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      placeholder="Pesquisar colaborador ou função..."
                      value={reportSearchQuery}
                      onChange={(e) => setReportSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                    />
                  </div>

                  {/* Collaborator Statistics List */}
                  <div className="space-y-4 print:space-y-6">
                    <h4 className="text-2xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest border-b border-stone-150 dark:border-stone-850 pb-2">
                      Frequência de Colaboradores
                    </h4>
                    <div className="divide-y divide-stone-100 dark:divide-stone-850 space-y-4">
                      {filteredReportData.map((c) => {
                        const totalScheduled = c.diasTrabalhados.length + c.diasCancelados.length;
                        const workedPercent = totalScheduled > 0 ? (c.diasTrabalhados.length / totalScheduled) * 100 : 0;
                        const cancelledPercent = totalScheduled > 0 ? (c.diasCancelados.length / totalScheduled) * 100 : 0;

                        return (
                          <div key={c.id} className="pt-4 first:pt-0 space-y-3.5 break-inside-avoid">
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-stone-100 dark:bg-stone-800 text-accent flex items-center justify-center font-bold text-sm print:border">
                                  {c.nome.charAt(0)}
                                </div>
                                <div>
                                  <h5 className="font-bold text-sm text-stone-850 dark:text-stone-100 print:text-black">
                                    {c.nome}
                                  </h5>
                                  <span className="text-3xs font-semibold px-2 py-0.5 bg-stone-100 dark:bg-stone-950 text-stone-600 dark:text-stone-400 rounded-md border border-stone-200/50 dark:border-stone-800/80">
                                    {c.funcao_padrao}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right text-xs">
                                <p className="font-bold text-stone-900 dark:text-white print:text-black">
                                  {totalScheduled} vez(es) escalado(a)
                                </p>
                                <p className="text-3xs text-stone-500 dark:text-stone-400 font-semibold mt-0.5">
                                  {c.diasTrabalhados.length} trabalhado(s) | {c.diasCancelados.length} suspenso(s)
                                </p>
                              </div>
                            </div>

                            {/* visual progress bar */}
                            <div className="space-y-1.5">
                              <div className="w-full bg-stone-100 dark:bg-stone-800/60 h-2.5 rounded-full overflow-hidden flex print:border print:border-black">
                                {workedPercent > 0 && (
                                  <div 
                                    className="bg-emerald-500 dark:bg-emerald-600 h-full transition-all duration-300 print:bg-stone-650" 
                                    style={{ width: `${workedPercent}%` }}
                                    title={`Trabalhado: ${workedPercent.toFixed(0)}%`}
                                  ></div>
                                )}
                                {cancelledPercent > 0 && (
                                  <div 
                                    className="bg-red-500 dark:bg-red-650 h-full transition-all duration-300 print:bg-stone-250" 
                                    style={{ width: `${cancelledPercent}%` }}
                                    title={`Cancelado pelo clima: ${cancelledPercent.toFixed(0)}%`}
                                  ></div>
                                )}
                              </div>
                            </div>

                            {/* Detailed dates grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1.5">
                              {c.diasTrabalhados.map((d, idx) => (
                                <div key={`t-${idx}`} className="p-2 rounded-xl bg-emerald-500/[0.03] border border-emerald-500/10 dark:bg-emerald-500/[0.01] flex items-center justify-between text-3xs">
                                  <div className="flex items-center gap-1.5">
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                    <span className="font-semibold text-stone-700 dark:text-stone-300">{formatDate(d.data, true)}</span>
                                  </div>
                                  <span className="text-stone-450 dark:text-stone-500 font-medium italic">{d.funcao}</span>
                                </div>
                              ))}
                              {c.diasCancelados.map((d, idx) => (
                                <div key={`c-${idx}`} className="p-2 rounded-xl bg-red-500/[0.03] border border-red-500/10 dark:bg-red-500/[0.01] flex items-center justify-between text-3xs">
                                  <div className="flex items-center gap-1.5">
                                    <CloudRain className="w-3.5 h-3.5 text-red-555" />
                                    <span className="font-semibold text-stone-700 dark:text-stone-300">{formatDate(d.data, true)}</span>
                                  </div>
                                  <span className="text-stone-450 dark:text-stone-500 font-medium italic">Clima</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row gap-3 justify-end bg-stone-50/50 dark:bg-stone-900/50 print:hidden">
              <button
                onClick={() => setIsReportOpen(false)}
                className="px-5 py-2.5 bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-850 dark:text-stone-200 text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
              >
                Fechar
              </button>
              {reportData.length > 0 && (
                <>
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-stone-900 hover:bg-stone-850 dark:bg-stone-950 dark:hover:bg-stone-900 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir / PDF
                  </button>
                  <button
                    onClick={handleCopyReportToClipboard}
                    className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md shadow-accent/15 transition-all"
                  >
                    <Share2 className="w-4 h-4" />
                    Copiar p/ WhatsApp
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full bg-stone-900 text-stone-400 text-xs py-8 px-6 mt-16 border-t border-stone-850 text-center space-y-1.5">
        <p className="font-serif font-semibold text-accent tracking-wider">GUTBRAU RECREAÇÃO</p>
        <p>© 2026 GutBrau Cervejaria. Escalas de Recreação & Arvorismo.</p>
        <p className="text-[10px] text-stone-500 font-medium mt-1">Desenvolvido por Ryan Soares • Todos os direitos reservados</p>
      </footer>

    </div>
  );
}
