'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Lock, 
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
  Clipboard
} from 'lucide-react';
import { db } from '@/lib/db';
import { Escala } from '@/types/database';
import { formatDate } from '@/lib/utils';

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
    const resgatistas = dayItems.filter(item => item.funcao === 'Resgatista');
    const caixas = dayItems.filter(item => item.funcao === 'Caixa');
    const monitores = dayItems.filter(item => item.funcao === 'Monitor');

    return {
      resgatista1: resgatistas[0]?.colaborador?.nome || '',
      resgatista2: resgatistas[1]?.colaborador?.nome || '',
      monitor1: monitores[0]?.colaborador?.nome || '',
      monitor2: monitores[1]?.colaborador?.nome || '',
      monitor3: monitores[2]?.colaborador?.nome || '',
      caixa: caixas[0]?.colaborador?.nome || '',
    };
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
        }))
      );

      setEscalas(prev => prev.map(e => e.id === escala.id ? updated : e));
    } catch (err) {
      console.error('Erro ao alternar cancelamento do dia:', err);
      alert('Erro ao salvar alteração.');
    }
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
        <nav className="w-full bg-primary text-white border-b border-primary-hover px-6 py-4 flex justify-between items-center shadow-md">
          <div className="flex items-center gap-2.5">
            {/* Lúpulo SVG Oficial */}
            <svg className="w-7 h-7 text-accent fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C11.3 3.5 9.8 5 8 5.8 7 6.2 5.8 6.2 4.8 5.8c.8 1.5 2.2 2.7 4.2 3.2.7.2 1.3.6 1.8 1.2-.5 1.1-1.3 2.1-2.7 2.8-1 .5-2.2.6-3.2.2.8 1.5 2.2 2.7 4.2 3.2 1.5.4 2.7 1.8 3.2 3.3.5-1.5 1.7-2.9 3.2-3.3 2-.5 3.4-1.7 4.2-3.2-1 .4-2.2.3-3.2-.2-1.4-.7-2.2-1.7-2.7-2.8.5-.6 1.1-1 1.8-1.2 2-.5 3.4-1.7 4.2-3.2-1 .4-2.2.4-3.2 0-1.8-.8-3.3-2.3-4-3.8zm0 7c.5.8 1.2 1.5 2.2 2 .8.4 1.8.5 2.8.2-.5.8-1.3 1.5-2.5 1.8-1.2.3-2 1.2-2.5 2.3-.5-1.1-1.3-2-2.5-2.3-1.2-.3-2-1-2.5-1.8 1 .3 2 .2 2.8-.2 1-.5 1.7-1.2 2.2-2z"/>
            </svg>
            <span className="font-serif text-lg font-extrabold tracking-widest text-accent">GUTBRAU</span>
          </div>
          <Link 
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-750 text-stone-200 text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
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
      <nav className="w-full bg-primary text-white border-b border-primary-hover px-6 py-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2.5">
          {/* Lúpulo SVG Oficial */}
          <svg className="w-7 h-7 text-accent fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C11.3 3.5 9.8 5 8 5.8 7 6.2 5.8 6.2 4.8 5.8c.8 1.5 2.2 2.7 4.2 3.2.7.2 1.3.6 1.8 1.2-.5 1.1-1.3 2.1-2.7 2.8-1 .5-2.2.6-3.2.2.8 1.5 2.2 2.7 4.2 3.2 1.5.4 2.7 1.8 3.2 3.3.5-1.5 1.7-2.9 3.2-3.3 2-.5 3.4-1.7 4.2-3.2-1 .4-2.2.3-3.2-.2-1.4-.7-2.2-1.7-2.7-2.8.5-.6 1.1-1 1.8-1.2 2-.5 3.4-1.7 4.2-3.2-1 .4-2.2.4-3.2 0-1.8-.8-3.3-2.3-4-3.8zm0 7c.5.8 1.2 1.5 2.2 2 .8.4 1.8.5 2.8.2-.5.8-1.3 1.5-2.5 1.8-1.2.3-2 1.2-2.5 2.3-.5-1.1-1.3-2-2.5-2.3-1.2-.3-2-1-2.5-1.8 1 .3 2 .2 2.8-.2 1-.5 1.7-1.2 2.2-2z"/>
          </svg>
          <span className="font-serif text-lg font-extrabold tracking-widest text-accent">GUTBRAU</span>
          <span className="text-2xs font-semibold px-2 py-0.5 bg-accent/10 text-accent rounded-full border border-accent/20 uppercase tracking-widest ml-1 hidden sm:inline-block">
            Administrador
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link 
            href="/"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-stone-850 hover:bg-stone-800 dark:bg-stone-900 dark:hover:bg-stone-850 text-stone-200 text-xs font-bold rounded-xl transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Ver Portal
          </Link>
          <button 
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-red-650 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-red-900/15"
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
          <h3 className="text-lg font-serif font-extrabold text-stone-850 dark:text-stone-150 flex items-center gap-2 pb-2 border-b border-stone-200 dark:border-stone-800">
            <Calendar className="w-5 h-5 text-accent" />
            Histórico de Escalas Criadas
          </h3>

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
                          escala.sabado_cancelado && escala.domingo_cancelado
                            ? 'bg-red-500/10 text-red-750 border border-red-500/20'
                            : escala.sabado_cancelado || escala.domingo_cancelado
                              ? 'bg-amber-500/10 text-amber-700 dark:text-accent border border-amber-500/20'
                              : escala.publicada 
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20' 
                                : 'bg-stone-100 text-stone-500 border border-stone-200 dark:bg-stone-950 dark:text-stone-400 dark:border-stone-800'
                        }`}>
                          {escala.sabado_cancelado && escala.domingo_cancelado
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

                    <div className="flex items-center gap-2">
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
                        onClick={() => handleToggleCancelDay(escala, 'sabado')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                          escala.sabado_cancelado
                            ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border-emerald-500/20 dark:text-emerald-400'
                            : 'bg-red-500/10 hover:bg-red-500/20 text-red-650 border-red-500/20 dark:text-red-400'
                        }`}
                        title={escala.sabado_cancelado ? 'Ativar Sábado' : 'Suspender Sábado'}
                      >
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>Sáb {escala.sabado_cancelado ? 'Cancel' : 'Ativo'}</span>
                      </button>

                      {/* Cancel Sunday */}
                      <button
                        onClick={() => handleToggleCancelDay(escala, 'domingo')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                          escala.domingo_cancelado
                            ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border-emerald-500/20 dark:text-emerald-400'
                            : 'bg-red-500/10 hover:bg-red-500/20 text-red-650 border-red-500/20 dark:text-red-400'
                        }`}
                        title={escala.domingo_cancelado ? 'Ativar Domingo' : 'Suspender Domingo'}
                      >
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>Dom {escala.domingo_cancelado ? 'Cancel' : 'Ativo'}</span>
                      </button>

                      <Link
                        href={`/admin/editar/${escala.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 dark:bg-stone-950 dark:hover:bg-stone-850 dark:border dark:border-stone-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-accent" />
                        Editar
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-sm transition-all duration-300 animate-fadeIn print:absolute print:inset-0 print:bg-white print:p-0 print:backdrop-blur-none">
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
                    const monday = new Date(exportEscala.data_inicio + 'T00:00:00');
                    const satDate = new Date(monday);
                    satDate.setDate(monday.getDate() + 5);
                    const satStr = satDate.toISOString().split('T')[0];
                    const rows = getTableRowsForDate(satStr, exportEscala.itens);
                    const header = `Arvorismo - Sábado ${String(satDate.getDate()).padStart(2, '0')}/${String(satDate.getMonth() + 1).padStart(2, '0')}`;
                    return renderExportTable(header, rows);
                  })()}

                  {/* Sunday Table */}
                  {(() => {
                    const monday = new Date(exportEscala.data_inicio + 'T00:00:00');
                    const sunDate = new Date(monday);
                    sunDate.setDate(monday.getDate() + 6);
                    const sunStr = sunDate.toISOString().split('T')[0];
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

      {/* Footer */}
      <footer className="w-full bg-stone-900 text-stone-400 text-xs py-8 px-6 mt-16 border-t border-stone-850 text-center space-y-2.5">
        <p className="font-serif font-semibold text-accent tracking-wider">GUTBRAU CERVEJARIA</p>
        <p>© 2026 GutBrau Cervejaria. Painel de Controle Interno.</p>
      </footer>

    </div>
  );
}
