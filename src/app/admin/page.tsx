'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Lock, 
  Unlock,
  Beer, 
  Calendar, 
  Plus, 
  Users, 
  Trash2, 
  Edit3, 
  LogOut, 
  Eye, 
  EyeOff, 
  ArrowLeft,
  CalendarDays,
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  Printer,
  X,
  Share2,
  Clipboard,
  FileText,
  MessageSquare
} from 'lucide-react';
import { db } from '@/lib/db';
import { formatDate } from '@/lib/utils';
import { Escala, Colaborador } from '@/types/database';

interface AdminReportItem {
  colaborador: Colaborador;
  totalTurnos: number;
  diasTrabalhadosCount: number;
  diasCanceladosCount: number;
  detalhesTurnos: {
    data: string;
    funcao: string;
    turno: string;
    status: string; // 'Trabalhado' | 'Cancelado'
    comentario_interno?: string;
    treinamento?: boolean;
  }[];
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Dashboard state
  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [loadingEscalas, setLoadingEscalas] = useState(false);

  // Export modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportEscala, setExportEscala] = useState<any | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  // Admin Report state
  const [isAdminReportOpen, setIsAdminReportOpen] = useState(false);
  const [adminReportLoading, setAdminReportLoading] = useState(false);
  const [adminReportData, setAdminReportData] = useState<AdminReportItem[]>([]);
  const [adminReportMonth, setAdminReportMonth] = useState('');

  const handleExportScale = async (escala: Escala) => {
    setExportLoading(true);
    setIsExportModalOpen(true);
    try {
      const full = await db.getEscalaById(escala.id);
      setExportEscala(full);
    } catch (err) {
      console.error('Erro ao carregar escala para exportação:', err);
      alert('Erro ao carregar escala.');
      setIsExportModalOpen(false);
    } finally {
      setExportLoading(false);
    }
  };

  const getTableRowsForDate = (dateStr: string, items: any[]) => {
    const dayItems = items.filter(item => item.data === dateStr);
    
    const result = {
      resgatista1: '',
      resgatista2: '',
      monitor1: '',
      monitor2: '',
      monitor3: '',
      caixa: '',
    };
    
    const genericResgatistas: any[] = [];
    const genericMonitores: any[] = [];
    const genericCaixas: any[] = [];
    
    dayItems.forEach(item => {
      const func = (item.funcao || '').trim();
      const name = item.colaborador?.nome || '';
      const displayName = item.treinamento ? `${name}***` : name;
      
      if (func === 'Resgatista 1') {
        result.resgatista1 = displayName;
      } else if (func === 'Resgatista 2') {
        result.resgatista2 = displayName;
      } else if (func === 'Monitor I (Tirolesa)' || func === 'Monitor 1 - Tirolesa') {
        result.monitor1 = displayName;
      } else if (func === 'Monitor II (Base)' || func === 'Monitor 2 - Base') {
        result.monitor2 = displayName;
      } else if (func === 'Monitor III (Bike/Caixa)' || func === 'Monitor 3 Base/Caixa') {
        result.monitor3 = displayName;
      } else if (func === 'Caixa') {
        result.caixa = displayName;
      } else if (func === 'Resgatista') {
        genericResgatistas.push(item);
      } else if (func === 'Monitor') {
        genericMonitores.push(item);
      } else {
        if (func.toLowerCase().includes('resgatista')) {
          genericResgatistas.push(item);
        } else if (func.toLowerCase().includes('caixa')) {
          genericCaixas.push(item);
        } else if (func.toLowerCase().includes('monitor')) {
          genericMonitores.push(item);
        }
      }
    });
    
    genericResgatistas.forEach(item => {
      const name = item.colaborador?.nome || '';
      const displayName = item.treinamento ? `${name}***` : name;
      if (!result.resgatista1) {
        result.resgatista1 = displayName;
      } else if (!result.resgatista2) {
        result.resgatista2 = displayName;
      }
    });
    
    genericCaixas.forEach(item => {
      const name = item.colaborador?.nome || '';
      const displayName = item.treinamento ? `${name}***` : name;
      if (!result.caixa) {
        result.caixa = displayName;
      }
    });

    genericMonitores.forEach(item => {
      const name = item.colaborador?.nome || '';
      const displayName = item.treinamento ? `${name}***` : name;
      if (!result.monitor1) {
        result.monitor1 = displayName;
      } else if (!result.monitor2) {
        result.monitor2 = displayName;
      } else if (!result.monitor3) {
        result.monitor3 = displayName;
      }
    });

    return result;
  };

  const renderExportTable = (title: string, data: ReturnType<typeof getTableRowsForDate>) => {
    return (
      <div className="flex flex-col items-center bg-white p-4 rounded-lg text-black font-sans break-inside-avoid">
        <h4 className="font-bold text-center text-sm mb-2 font-sans">{title}</h4>
        <table className="w-full max-w-md border-collapse border-[1.5px] border-black text-xs font-sans">
          <tbody>
            <tr>
              <td className="w-1/2 border border-black px-4 py-2 font-bold bg-stone-50">Resgatista 1</td>
              <td className="w-1/2 border border-black px-4 py-2 text-center">{data.resgatista1}</td>
            </tr>
            <tr>
              <td className="w-1/2 border border-black px-4 py-2 font-bold bg-stone-50">Resgatista 2</td>
              <td className="w-1/2 border border-black px-4 py-2 text-center">{data.resgatista2}</td>
            </tr>
            <tr>
              <td className="w-1/2 border border-black px-4 py-2 font-bold bg-stone-50">Monitor I (Tirolesa)</td>
              <td className="w-1/2 border border-black px-4 py-2 text-center">{data.monitor1}</td>
            </tr>
            <tr>
              <td className="w-1/2 border border-black px-4 py-2 font-bold bg-stone-50">Monitor II (Base)</td>
              <td className="w-1/2 border border-black px-4 py-2 text-center">{data.monitor2}</td>
            </tr>
            <tr>
              <td className="w-1/2 border border-black px-4 py-2 font-bold bg-stone-50">Monitor III (Bike/Caixa)</td>
              <td className="w-1/2 border border-black px-4 py-2 text-center">{data.monitor3}</td>
            </tr>
            <tr>
              <td className="w-1/2 border border-black px-4 py-2 font-bold bg-stone-50">Caixa</td>
              <td className="w-1/2 border border-black px-4 py-2 text-center">{data.caixa}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/admin/auth');
      const data = await res.json();
      if (data.authenticated) {
        setIsAuthenticated(true);
        loadEscalas();
      }
    } catch (err) {
      console.error('Erro ao checar autenticação:', err);
    } finally {
      setCheckingAuth(false);
    }
  };

  const loadEscalas = async () => {
    try {
      setLoadingEscalas(true);
      const data = await db.getEscalas();
      setEscalas(data);
    } catch (err) {
      console.error('Erro ao carregar escalas:', err);
    } finally {
      setLoadingEscalas(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (data.success) {
        setIsAuthenticated(true);
        loadEscalas();
      } else {
        setLoginError(data.error || 'Senha incorreta.');
      }
    } catch (err) {
      setLoginError('Erro de conexão com o servidor.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth', { method: 'DELETE' });
      setIsAuthenticated(false);
      setPassword('');
    } catch (err) {
      console.error('Erro ao deslogar:', err);
    }
  };

  const handleDeleteEscala = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta escala? Esta ação é irreversível.')) {
      return;
    }

    try {
      await db.deleteEscala(id);
      setEscalas(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      alert('Erro ao excluir escala.');
    }
  };

  const handleTogglePublish = async (escala: Escala) => {
    try {
      const full = await db.getEscalaById(escala.id);
      if (!full) return;

      const updated = await db.saveEscala(
        { ...escala, publicada: !escala.publicada },
        full.itens.map(item => ({
          colaborador_id: item.colaborador_id,
          data: item.data,
          turno: item.turno,
          funcao: item.funcao,
          treinamento: item.treinamento,
          comentario_interno: item.comentario_interno,
        }))
      );

      setEscalas(prev => prev.map(e => e.id === escala.id ? updated : e));
    } catch (err) {
      console.error('Erro ao alternar publicação:', err);
      alert('Erro ao salvar alteração.');
    }
  };
  
  const handleToggleCancelDay = async (escala: Escala, dia: 'sabado' | 'domingo') => {
    try {
      const full = await db.getEscalaById(escala.id);
      if (!full) return;

      const updatedFields = {
        sabado_cancelado: dia === 'sabado' ? !escala.sabado_cancelado : escala.sabado_cancelado,
        domingo_cancelado: dia === 'domingo' ? !escala.domingo_cancelado : escala.domingo_cancelado,
      };

      const updated = await db.saveEscala(
        { ...escala, ...updatedFields },
        full.itens.map(item => ({
          colaborador_id: item.colaborador_id,
          data: item.data,
          turno: item.turno,
          funcao: item.funcao,
          treinamento: item.treinamento,
          comentario_interno: item.comentario_interno,
        }))
      );

      setEscalas(prev => prev.map(e => e.id === escala.id ? updated : e));
    } catch (err) {
      console.error('Erro ao alternar cancelamento do dia:', err);
      alert('Erro ao salvar alteração.');
    }
  };

  const handleToggleFinalize = async (escala: Escala) => {
    try {
      const full = await db.getEscalaById(escala.id);
      if (!full) return;

      const updated = await db.saveEscala(
        { ...escala, finalizada: !escala.finalizada },
        full.itens.map(item => ({
          colaborador_id: item.colaborador_id,
          data: item.data,
          turno: item.turno,
          funcao: item.funcao,
          treinamento: item.treinamento,
          comentario_interno: item.comentario_interno,
        }))
      );

      setEscalas(prev => prev.map(e => e.id === escala.id ? updated : e));
    } catch (err) {
      console.error('Erro ao alternar finalização:', err);
      alert('Erro ao salvar alteração.');
    }
  };

  const getUniqueMonths = () => {
    const months = new Set<string>();
    escalas.forEach(escala => {
      const date = new Date(escala.data_inicio + 'T00:00:00');
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.add(monthStr);
    });
    return Array.from(months).sort().reverse();
  };

  const generateAdminReport = async (monthFilter: string) => {
    try {
      setAdminReportLoading(true);
      const allScales = await db.getEscalas();
      
      const filteredScales = allScales.filter(escala => {
        if (!monthFilter) return true;
        const scaleDate = new Date(escala.data_inicio + 'T00:00:00');
        const scaleMonth = `${scaleDate.getFullYear()}-${String(scaleDate.getMonth() + 1).padStart(2, '0')}`;
        return scaleMonth === monthFilter;
      });

      const detailedScales = await Promise.all(
        filteredScales.map(async (escala) => {
          const full = await db.getEscalaById(escala.id);
          return full;
        })
      );

      const allCollabs = await db.getColaboradores();

      const reportItems: AdminReportItem[] = allCollabs.map(collab => {
        const matchingShifts: any[] = [];
        let totalShifts = 0;
        let diasTrabalhados = 0;
        let diasCancelados = 0;

        detailedScales.forEach(escala => {
          if (!escala) return;
          escala.itens.forEach(item => {
            if (item.colaborador_id === collab.id) {
              totalShifts++;
              const dateObj = new Date(item.data + 'T00:00:00');
              const dayOfWeek = dateObj.getDay();
              const isSat = dayOfWeek === 6;
              const isSun = dayOfWeek === 0;
              
              let isCanceled = false;
              if (isSat && escala.sabado_cancelado) isCanceled = true;
              else if (isSun && escala.domingo_cancelado) isCanceled = true;

              if (isCanceled) {
                diasCancelados++;
              } else {
                diasTrabalhados++;
              }

              matchingShifts.push({
                data: item.data,
                funcao: item.funcao,
                turno: item.turno,
                status: isCanceled ? 'Cancelado' : 'Trabalhado',
                comentario_interno: item.comentario_interno || '',
                treinamento: !!item.treinamento,
              });
            }
          });
        });

        matchingShifts.sort((a, b) => b.data.localeCompare(a.data));

        return {
          colaborador: collab,
          totalTurnos: totalShifts,
          diasTrabalhadosCount: diasTrabalhados,
          diasCanceladosCount: diasCancelados,
          detalhesTurnos: matchingShifts,
        };
      });

      const activeReport = reportItems.filter(item => item.totalTurnos > 0);
      activeReport.sort((a, b) => a.colaborador.nome.localeCompare(b.colaborador.nome));
      setAdminReportData(activeReport);
    } catch (err) {
      console.error('Erro ao gerar relatório administrativo:', err);
      alert('Erro ao carregar dados do relatório.');
    } finally {
      setAdminReportLoading(false);
    }
  };

  const handleOpenAdminReport = () => {
    setIsAdminReportOpen(true);
    const months = getUniqueMonths();
    const defaultMonth = months.length > 0 ? months[0] : '';
    setAdminReportMonth(defaultMonth);
    generateAdminReport(defaultMonth);
  };

  const handleCopyAdminReport = () => {
    let text = `📊 *RELATÓRIO ADMINISTRATIVO - GUTBRAU*\n`;
    if (adminReportMonth) {
      const [year, month] = adminReportMonth.split('-');
      const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      text += `📅 Período: *${monthNames[parseInt(month) - 1]} de ${year}*\n\n`;
    } else {
      text += `📅 Período: *Todos os Tempos*\n\n`;
    }

    adminReportData.forEach(item => {
      const statusText = item.colaborador.ativo ? 'Ativo' : 'Inativo';
      text += `👤 *${item.colaborador.nome}* (${item.colaborador.funcao_padrao})\n`;
      text += `⭐ Pontos: *${item.colaborador.pontos || 10} pts* | Status: ${statusText}\n`;
      text += `📅 Escalado: ${item.totalTurnos} vezes (${item.diasTrabalhadosCount} presenciais, ${item.diasCanceladosCount} cancelados)\n`;
      
      if (item.detalhesTurnos.length > 0) {
        text += `📝 Histórico de Turnos:\n`;
        item.detalhesTurnos.forEach(turno => {
          const dateFormatted = formatDate(turno.data, true);
          let detail = `  • ${dateFormatted} - ${turno.funcao} (${turno.turno}) [${turno.status}]`;
          if (turno.treinamento) detail += ` [Treino]`;
          if (turno.comentario_interno) detail += ` | Obs: _${turno.comentario_interno}_`;
          text += detail + `\n`;
        });
      } else {
        text += `📝 Sem turnos agendados no período.\n`;
      }
      text += `\n`;
    });

    navigator.clipboard.writeText(text);
    alert('Relatório copiado com sucesso para a área de transferência!');
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin"></div>
        <p className="text-stone-500 dark:text-stone-400 text-sm font-semibold">Verificando credenciais...</p>
      </div>
    );
  }

  // LOGIN SCREEN
  if (!isAuthenticated) {
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
          </div>
          <Link 
            href="/"
            className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-850 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex-shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar
          </Link>
        </nav>

        <div className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="w-full max-w-md bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="text-center space-y-3 mb-8">
              <div className="inline-flex p-3 bg-accent/10 text-accent rounded-2xl mb-1">
                <Lock className="w-6.5 h-6.5" />
              </div>
              <h1 className="text-2xl font-serif font-bold text-stone-900 dark:text-white">Acesso Restrito</h1>
              <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                Digite a senha administrativa do portal GutBrau para acessar o gerenciamento de escalas.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label htmlFor="admin-pass" className="block text-3xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest mb-2">
                  Senha Administrativa
                </label>
                <input
                  id="admin-pass"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-3 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                />
              </div>

              {loginError && (
                <div className="text-xs text-red-650 font-semibold text-center bg-red-500/10 p-3 rounded-xl border border-red-500/20 flex items-center justify-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3.5 bg-accent hover:bg-accent-hover text-white font-bold rounded-2xl shadow-lg shadow-accent/25 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {loginLoading ? 'Verificando...' : 'Entrar no Painel'}
              </button>
            </form>

            <div className="mt-8 text-center border-t border-stone-100 dark:border-stone-800 pt-6">
              <Link 
                href="/"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-accent dark:text-stone-400 transition-colors uppercase tracking-wider"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar para a Escala Pública
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ADMIN DASHBOARD
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
          <span className="text-[10px] sm:text-2xs font-semibold px-1.5 py-0.5 sm:px-2 bg-accent/10 text-accent rounded-full border border-accent/20 uppercase tracking-widest ml-1.5 hidden sm:inline-block">
            Administrador
          </span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link 
            href="/"
            className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-1.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-850 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-[10px] sm:text-xs font-bold rounded-xl transition-all flex-shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Ver Portal
          </Link>
          <button 
            onClick={handleLogout}
            className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-1.5 bg-red-650 hover:bg-red-700 text-white text-[10px] sm:text-xs font-bold rounded-xl transition-all shadow-md shadow-red-900/15 flex-shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-10 space-y-8">
        
        {/* Banner Title */}
        <div>
          <h2 className="text-2xl font-serif font-extrabold text-stone-900 dark:text-white tracking-wide">
            Controle de Escalas
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Crie, edite e publique as escalas semanais para toda a equipe.
          </p>
        </div>

        {/* Dashboard Navigation Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/admin/editar/novo"
            className="flex items-center gap-4 p-6 bg-accent text-white rounded-3xl hover:bg-accent-hover shadow-lg shadow-accent/15 transition-all duration-200 hover:-translate-y-0.5"
          >
            <div className="p-3 bg-white/10 rounded-2xl">
              <Plus className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base">Nova Escala Semanal</h3>
              <p className="text-xs text-white/80 mt-0.5">Criar turnos para o próximo fim de semana</p>
            </div>
          </Link>

          <Link
            href="/admin/colaboradores"
            className="flex items-center gap-4 p-6 bg-primary text-white rounded-3xl hover:bg-primary-hover shadow-lg shadow-primary/10 border border-primary-hover transition-all duration-200 hover:-translate-y-0.5"
          >
            <div className="p-3 bg-white/10 rounded-2xl">
              <Users className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h3 className="font-bold text-base">Equipe de Colaboradores</h3>
              <p className="text-xs text-stone-250 mt-0.5">Cadastrar e gerenciar membros e cargos</p>
            </div>
          </Link>
        </div>

        {/* List of existing scales */}
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-stone-200 dark:border-stone-800">
            <h3 className="text-lg font-serif font-extrabold text-stone-850 dark:text-stone-150 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-accent" />
              Histórico de Escalas Criadas
            </h3>
            
            <button
              onClick={handleOpenAdminReport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-900 dark:hover:bg-stone-850 text-stone-700 dark:text-stone-300 text-xs font-bold rounded-xl transition-all border border-stone-250 dark:border-stone-800"
            >
              <FileText className="w-3.5 h-3.5 text-accent" />
              Relatório Geral
            </button>
          </div>

          {loadingEscalas ? (
            <div className="flex justify-center items-center py-12">
              <div className="w-8 h-8 border-3 border-accent/20 border-t-accent rounded-full animate-spin"></div>
            </div>
          ) : escalas.length > 0 ? (
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-850 rounded-3xl overflow-hidden shadow-sm">
              <div className="divide-y divide-stone-200 dark:divide-stone-800">
                {escalas.map(escala => (
                  <div 
                    key={escala.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 hover:bg-stone-50/40 dark:hover:bg-stone-950/20 transition-colors"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-sm text-stone-850 dark:text-stone-100">
                          Semana: {formatDate(escala.data_inicio, true)} a {formatDate(escala.data_fim, true)}
                        </span>
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          escala.finalizada
                            ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20'
                            : escala.sabado_cancelado && escala.domingo_cancelado
                              ? 'bg-red-500/10 text-red-750 border border-red-500/20'
                              : escala.sabado_cancelado || escala.domingo_cancelado
                                ? 'bg-amber-500/10 text-amber-700 dark:text-accent border border-amber-500/20'
                                : escala.publicada 
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20' 
                                  : 'bg-stone-100 text-stone-500 border border-stone-200 dark:bg-stone-950 dark:text-stone-400 dark:border-stone-800'
                        }`}>
                          {escala.finalizada
                            ? 'Completa'
                            : escala.sabado_cancelado && escala.domingo_cancelado
                              ? 'Cancelada' 
                              : escala.sabado_cancelado || escala.domingo_cancelado
                                ? 'Cancel. Parcial'
                                : escala.publicada 
                                  ? 'Publicada' 
                                  : 'Rascunho'}
                        </span>
                      </div>
                      {escala.observacoes && (
                        <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-1 italic">
                          Mural: "{escala.observacoes}"
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 justify-start sm:justify-end w-full sm:w-auto">
                      <button
                        onClick={() => handleTogglePublish(escala)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                          escala.publicada
                            ? 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200 dark:bg-stone-950 dark:hover:bg-stone-850 dark:text-stone-300 dark:border-stone-800'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/10'
                        }`}
                        title={escala.publicada ? 'Despublicar escala' : 'Publicar escala'}
                      >
                        {escala.publicada ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            Ocultar
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            Publicar
                          </>
                        )}
                      </button>

                      {/* Cancel Saturday */}
                      <button
                        onClick={() => !escala.finalizada && handleToggleCancelDay(escala, 'sabado')}
                        disabled={escala.finalizada}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                          escala.finalizada
                            ? 'bg-stone-100/50 text-stone-400 border-stone-200/50 cursor-not-allowed opacity-50 dark:bg-stone-900/30 dark:border-stone-850/30'
                            : escala.sabado_cancelado
                              ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border-emerald-500/20 dark:text-emerald-400'
                              : 'bg-red-500/10 hover:bg-red-500/20 text-red-650 border-red-500/20 dark:text-red-400'
                        }`}
                        title={escala.finalizada ? 'Escala bloqueada' : escala.sabado_cancelado ? 'Ativar Sábado' : 'Suspender Sábado'}
                      >
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>Sáb {escala.sabado_cancelado ? 'Cancel' : 'Ativo'}</span>
                      </button>

                      {/* Cancel Sunday */}
                      <button
                        onClick={() => !escala.finalizada && handleToggleCancelDay(escala, 'domingo')}
                        disabled={escala.finalizada}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                          escala.finalizada
                            ? 'bg-stone-100/50 text-stone-400 border-stone-200/50 cursor-not-allowed opacity-50 dark:bg-stone-900/30 dark:border-stone-850/30'
                            : escala.domingo_cancelado
                              ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border-emerald-500/20 dark:text-emerald-400'
                              : 'bg-red-500/10 hover:bg-red-500/20 text-red-650 border-red-500/20 dark:text-red-400'
                        }`}
                        title={escala.finalizada ? 'Escala bloqueada' : escala.domingo_cancelado ? 'Ativar Domingo' : 'Suspender Domingo'}
                      >
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>Dom {escala.domingo_cancelado ? 'Cancel' : 'Ativo'}</span>
                      </button>

                      {/* Finalize Lock Toggle */}
                      <button
                        onClick={() => handleToggleFinalize(escala)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                          escala.finalizada
                            ? 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 border-blue-500/20 dark:text-blue-400'
                            : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200 dark:bg-stone-950 dark:hover:bg-stone-850 dark:text-stone-300 dark:border-stone-800'
                        }`}
                        title={escala.finalizada ? 'Reabrir escala para edições' : 'Finalizar escala (Bloquear alterações)'}
                      >
                        {escala.finalizada ? (
                          <>
                            <Unlock className="w-3.5 h-3.5 text-blue-500" />
                            Reabrir
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            Finalizar
                          </>
                        )}
                      </button>

                      <Link
                        href={`/admin/editar/${escala.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 dark:bg-stone-950 dark:hover:bg-stone-850 dark:border dark:border-stone-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
                      >
                        {escala.finalizada ? (
                          <>
                            <Eye className="w-3.5 h-3.5 text-blue-400" />
                            Visualizar
                          </>
                        ) : (
                          <>
                            <Edit3 className="w-3.5 h-3.5 text-accent" />
                            Editar
                          </>
                        )}
                      </Link>

                      <button
                        onClick={() => handleExportScale(escala)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-850 dark:text-stone-250 text-xs font-bold uppercase tracking-wider rounded-xl transition-all border border-stone-200 dark:border-stone-850"
                      >
                        <Share2 className="w-3.5 h-3.5 text-accent" />
                        Exportar
                      </button>

                      <button
                        onClick={() => handleDeleteEscala(escala.id)}
                        className="inline-flex items-center justify-center p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-650 dark:text-red-405 rounded-xl transition-all"
                        title="Excluir escala"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-10 text-center space-y-4 shadow-sm">
              <CalendarDays className="w-12 h-12 text-stone-400 mx-auto" />
              <h4 className="font-bold text-stone-800 dark:text-stone-200">Nenhuma escala cadastrada</h4>
              <p className="text-stone-500 dark:text-stone-400 max-w-sm mx-auto text-xs leading-relaxed">
                Clique no botão **"Nova Escala Semanal"** para começar a agendar turnos de trabalho da GutBrau.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Export Modal overlay */}
      {isExportModalOpen && exportEscala && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75 transition-all duration-300 animate-fadeIn print:absolute print:inset-0 print:bg-white print:p-0">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-850 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col relative overflow-hidden animate-scaleIn print:border-none print:shadow-none print:max-h-none print:w-full print:overflow-visible">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex justify-between items-center bg-stone-50/50 dark:bg-stone-900/50 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-accent" />
                <div>
                  <h3 className="font-serif text-base font-bold text-stone-900 dark:text-white">
                    Exportar Tabelas da Escala
                  </h3>
                  <p className="text-3xs text-stone-500 dark:text-stone-450 font-bold uppercase tracking-wider">
                    Semana: {formatDate(exportEscala.data_inicio, true)} a {formatDate(exportEscala.data_fim, true)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="p-1.5 hover:bg-stone-250 dark:hover:bg-stone-850 rounded-full text-stone-450 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-stone-50 dark:bg-stone-950/20 print:bg-white print:p-0 print:overflow-visible">
              {exportLoading ? (
                <div className="flex justify-center items-center py-16">
                  <div className="w-8 h-8 border-3 border-accent/20 border-t-accent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div id="export-tables-container" className="space-y-8 bg-white p-6 rounded-2xl border border-stone-200 dark:border-stone-850 print:border-none print:p-0 print:space-y-12">
                  
                  {/* Saturday Table */}
                  {(() => {
                    const sunDate = new Date(exportEscala.data_fim + 'T00:00:00');
                    const satDate = new Date(sunDate);
                    satDate.setDate(sunDate.getDate() - 1);
                    const satStr = satDate.toISOString().split('T')[0];
                    const rows = getTableRowsForDate(satStr, exportEscala.itens);
                    const header = `Arvorismo - Sábado ${String(satDate.getDate()).padStart(2, '0')}/${String(satDate.getMonth() + 1).padStart(2, '0')}`;
                    return renderExportTable(header, rows);
                  })()}

                  {/* Sunday Table */}
                  {(() => {
                    const sunStr = exportEscala.data_fim;
                    const sunDate = new Date(sunStr + 'T00:00:00');
                    const rows = getTableRowsForDate(sunStr, exportEscala.itens);
                    const header = `Arvorismo - Domingo ${String(sunDate.getDate()).padStart(2, '0')}/${String(sunDate.getMonth() + 1).padStart(2, '0')}`;
                    return renderExportTable(header, rows);
                  })()}

                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-stone-200 dark:border-stone-800 flex justify-end gap-3 bg-stone-50/50 dark:bg-stone-900/50 print:hidden">
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-850 dark:text-stone-200 text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
              >
                Fechar
              </button>
              {!exportLoading && (
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-accent/15"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir / Salvar PDF
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Administrative Report Modal overlay */}
      {isAdminReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75 transition-all duration-300 animate-fadeIn print:absolute print:inset-0 print:bg-white print:p-0 animate-fadeIn">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-850 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col relative overflow-hidden animate-scaleIn print:border-none print:shadow-none print:max-h-none print:w-full print:overflow-visible">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex justify-between items-center bg-stone-50/50 dark:bg-stone-900/50 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-accent" />
                <div>
                  <h3 className="font-serif text-base font-bold text-stone-900 dark:text-white">
                    Relatório Administrativo Geral
                  </h3>
                  <p className="text-3xs text-stone-500 dark:text-stone-450 font-bold uppercase tracking-wider">
                    Estatísticas consolidadas da equipe e histórico de turnos
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAdminReportOpen(false)}
                className="p-1.5 hover:bg-stone-250 dark:hover:bg-stone-850 rounded-full text-stone-450 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter controls at the top (hidden in print) */}
            <div className="px-6 py-4 bg-white dark:bg-stone-900 border-b border-stone-150 dark:border-stone-850 flex flex-wrap items-center justify-between gap-3 print:hidden">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-500 dark:text-stone-450 uppercase tracking-wider">Filtrar Período:</span>
                <select
                  value={adminReportMonth}
                  onChange={(e) => {
                    setAdminReportMonth(e.target.value);
                    generateAdminReport(e.target.value);
                  }}
                  className="bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="">Todos os Tempos</option>
                  {getUniqueMonths().map(m => {
                    const [year, month] = m.split('-');
                    const monthNames = [
                      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
                    ];
                    return (
                      <option key={m} value={m}>
                        {monthNames[parseInt(month) - 1]} de {year}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="text-3xs text-stone-450 font-bold uppercase tracking-wider">
                Total de membros analisados: {adminReportData.length}
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-stone-50 dark:bg-stone-950/20 print:bg-white print:p-0 print:overflow-visible">
              {adminReportLoading ? (
                <div className="flex justify-center items-center py-16">
                  <div className="w-8 h-8 border-3 border-accent/20 border-t-accent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div id="admin-report-container" className="space-y-8 print:space-y-12">
                  
                  {/* Print Header */}
                  <div className="hidden print:flex items-center justify-between pb-6 border-b border-stone-300 mb-8">
                    <div>
                      <h1 className="text-xl font-serif font-bold text-stone-900">Relatório Administrativo de Equipe</h1>
                      <p className="text-xs text-stone-500 mt-1">
                        Período: {adminReportMonth ? adminReportMonth : 'Todos os Tempos'}
                      </p>
                    </div>
                    <img src="/logo_ext_verde.png" alt="GutBrau Logo" className="h-10 w-auto object-contain" />
                  </div>

                  {/* Summary Table */}
                  <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-850 shadow-sm print:border-none print:shadow-none print:p-0">
                    <h4 className="font-serif text-sm font-bold text-stone-850 dark:text-stone-100 mb-4 flex items-center gap-1.5 border-b border-stone-100 dark:border-stone-800 pb-2">
                      Resumo da Frequência e Pontuação
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-stone-200 dark:border-stone-800 text-stone-450 dark:text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                            <th className="py-2.5 px-3">Colaborador</th>
                            <th className="py-2.5 px-3">Função Padrão</th>
                            <th className="py-2.5 px-3 text-center">Pontos (Score)</th>
                            <th className="py-2.5 px-3 text-center">Frequência</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60 font-medium">
                          {adminReportData.map(item => (
                            <tr key={item.colaborador.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-950/20 text-stone-800 dark:text-stone-200">
                              <td className="py-3 px-3 font-bold">{item.colaborador.nome}</td>
                              <td className="py-3 px-3 text-stone-550 dark:text-stone-400">{item.colaborador.funcao_padrao || 'Recreador'}</td>
                              <td className="py-3 px-3 text-center font-extrabold text-stone-900 dark:text-stone-100">
                                ⭐ {item.colaborador.pontos ?? 10} pts
                              </td>
                              <td className="py-3 px-3 text-center text-stone-600 dark:text-stone-300">
                                <span className="text-emerald-650 dark:text-emerald-400 font-extrabold">{item.diasTrabalhadosCount}</span>
                                <span className="text-stone-450 mx-1">/</span>
                                <span className="font-bold">{item.totalTurnos}</span>
                                {item.diasCanceladosCount > 0 && (
                                  <span className="text-red-500 text-[10px] font-bold ml-1.5">({item.diasCanceladosCount} cancel)</span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                  item.colaborador.ativo
                                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                                    : 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400 border border-stone-200 dark:border-stone-700'
                                }`}>
                                  {item.colaborador.ativo ? 'Ativo' : 'Inativo'}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {adminReportData.length === 0 && (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-stone-450 italic">
                                Nenhum colaborador cadastrado.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Detailed shift breakdown for each collaborator */}
                  <div className="space-y-6 print:space-y-8">
                    <h4 className="font-serif text-sm font-bold text-stone-850 dark:text-stone-150 border-b border-stone-200 dark:border-stone-800 pb-2 flex items-center gap-1.5">
                      Detalhamento de Turnos e Comentários Administrativos
                    </h4>
                    
                    <div className="grid grid-cols-1 gap-5">
                      {adminReportData.map(item => (
                        <div 
                          key={item.colaborador.id}
                          className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-850 rounded-2xl p-5 shadow-sm space-y-3.5 break-inside-avoid print:border-none print:shadow-none print:p-0 print:border-b print:border-stone-205 print:pb-6 print:rounded-none"
                        >
                          <div className="flex justify-between items-center pb-2 border-b border-stone-100 dark:border-stone-800/60">
                            <h5 className="font-bold text-stone-850 dark:text-stone-100 text-sm">
                              {item.colaborador.nome} 
                              <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 ml-1.5">
                                ({item.colaborador.funcao_padrao})
                              </span>
                            </h5>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-extrabold text-stone-750 dark:text-stone-300 uppercase tracking-wider bg-stone-100 dark:bg-stone-950 px-2 py-0.5 rounded-md">
                                ⭐ {item.colaborador.pontos ?? 10} pts
                              </span>
                            </div>
                          </div>

                          {item.detalhesTurnos.length === 0 ? (
                            <p className="text-xs text-stone-400 dark:text-stone-550 italic py-2">
                              Sem escalas registradas no período selecionado.
                            </p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-3xs font-medium">
                                <thead>
                                  <tr className="border-b border-stone-100 dark:border-stone-800 text-stone-450 dark:text-stone-500 uppercase tracking-wider text-[9px]">
                                    <th className="py-2 px-2">Data</th>
                                    <th className="py-2 px-2">Função Exercida</th>
                                    <th className="py-2 px-2 text-center">Horário</th>
                                    <th className="py-2 px-2 text-center">Status</th>
                                    <th className="py-2 px-2 text-center">Treinamento</th>
                                    <th className="py-2 px-2">Anotação Administrativa (Interna)</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-50 dark:divide-stone-900/40 text-stone-700 dark:text-stone-300">
                                  {item.detalhesTurnos.map((turno, idx) => (
                                    <tr key={idx} className="hover:bg-stone-50/20 dark:hover:bg-stone-950/10">
                                      <td className="py-2.5 px-2 font-bold">{formatDate(turno.data, true)}</td>
                                      <td className="py-2.5 px-2 font-semibold text-stone-850 dark:text-stone-200">{turno.funcao}</td>
                                      <td className="py-2.5 px-2 text-center text-stone-550 dark:text-stone-400">{turno.turno}</td>
                                      <td className="py-2.5 px-2 text-center">
                                        <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                                          turno.status === 'Trabalhado'
                                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-450'
                                            : 'bg-red-500/10 text-red-600 dark:text-red-400'
                                        }`}>
                                          {turno.status === 'Trabalhado' ? 'Presença' : 'Cancelado'}
                                        </span>
                                      </td>
                                      <td className="py-2.5 px-2 text-center">
                                        {turno.treinamento ? (
                                          <span className="text-[8px] bg-amber-500/15 text-amber-700 dark:text-amber-450 px-1.5 py-0.2 rounded font-bold uppercase tracking-wider">Sim</span>
                                        ) : (
                                          <span className="text-stone-400">-</span>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-2 italic text-stone-800 dark:text-stone-250 break-words" title={turno.comentario_interno}>
                                        {turno.comentario_interno ? (
                                          <div className="flex items-start gap-1">
                                            <MessageSquare className="w-3 h-3 text-stone-400 mt-1 flex-shrink-0" />
                                            <span className="whitespace-pre-wrap">{turno.comentario_interno}</span>
                                          </div>
                                        ) : (
                                          <span className="text-stone-400/60">-</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-stone-200 dark:border-stone-800 flex justify-end gap-3 bg-stone-50/50 dark:bg-stone-900/50 print:hidden">
              <button
                onClick={() => setIsAdminReportOpen(false)}
                className="px-4 py-2 bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-850 dark:text-stone-200 text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
              >
                Fechar
              </button>
              
              {!adminReportLoading && adminReportData.length > 0 && (
                <>
                  <button
                    onClick={handleCopyAdminReport}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-150 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-850 dark:text-stone-250 text-xs font-bold uppercase tracking-wider rounded-xl transition-all border border-stone-250 dark:border-stone-800"
                  >
                    <Share2 className="w-4 h-4 text-accent" />
                    Copiar Resumo (WhatsApp)
                  </button>
                  
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-accent/15"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir / Salvar PDF
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full bg-stone-900 text-stone-400 text-xs py-8 px-6 mt-16 border-t border-stone-850 text-center space-y-1.5">
        <p className="font-serif font-semibold text-accent tracking-wider">GUTBRAU CERVEJARIA</p>
        <p>© 2026 GutBrau Cervejaria. Painel de Controle Interno.</p>
        <p className="text-[10px] text-stone-500 font-medium mt-1">Desenvolvido por Ryan Soares • Todos os direitos reservados</p>
      </footer>

    </div>
  );
}
