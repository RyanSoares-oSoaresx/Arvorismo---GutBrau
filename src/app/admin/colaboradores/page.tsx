'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit2, 
  ArrowLeft, 
  Save, 
  X,
  Phone,
  Briefcase,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { db } from '@/lib/db';
import { Colaborador } from '@/types/database';

export default function ManageColaboradoresPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Estados de dados
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados do formulário
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [funcao, setFuncao] = useState('Monitor');
  const [ativo, setAtivo] = useState(true);
  const [pontos, setPontos] = useState(10);
  const [formError, setFormError] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/admin/auth');
      const data = await res.json();
      if (data.authenticated) {
        setIsAuthenticated(true);
        loadColaboradores();
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

  const loadColaboradores = async () => {
    try {
      setLoading(true);
      const data = await db.getColaboradores();
      setColaboradores(data);
    } catch (err) {
      console.error('Erro ao carregar colaboradores:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (colaborador: Colaborador) => {
    setEditingId(colaborador.id);
    setNome(colaborador.nome);
    setTelefone(colaborador.telefone || '');
    setFuncao(colaborador.funcao_padrao);
    setAtivo(colaborador.ativo);
    setPontos(colaborador.pontos !== undefined && colaborador.pontos !== null ? colaborador.pontos : 10);
    setShowForm(true);
    setFormError('');
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setNome('');
    setTelefone('');
    setFuncao('Monitor');
    setAtivo(true);
    setPontos(10);
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setFormError('O nome é obrigatório.');
      return;
    }

    setFormError('');
    setSaveLoading(true);

    try {
      const payload: Omit<Colaborador, 'id'> & { id?: string } = {
        nome: nome.trim(),
        telefone: telefone.trim() || undefined,
        funcao_padrao: funcao,
        ativo,
        pontos,
      };
      
      if (editingId) {
        payload.id = editingId;
      }

      await db.saveColaborador(payload);
      
      handleCancelForm();
      loadColaboradores();
    } catch (err) {
      console.error('Erro ao salvar colaborador:', err);
      setFormError('Erro ao salvar. Verifique a conexão com o banco de dados.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleUpdatePoints = async (id: string, increment: number) => {
    try {
      const col = colaboradores.find(c => c.id === id);
      if (!col) return;
      
      const currentPoints = col.pontos !== undefined && col.pontos !== null ? col.pontos : 10;
      const updatedPoints = Math.max(0, currentPoints + increment);
      
      const payload = {
        ...col,
        pontos: updatedPoints
      };
      
      await db.saveColaborador(payload);
      setColaboradores(prev => prev.map(c => c.id === id ? { ...c, pontos: updatedPoints } : c));
    } catch (err) {
      console.error('Erro ao atualizar pontos:', err);
      alert('Erro ao atualizar pontuação.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente excluir o colaborador "${name}"? Esta ação removerá seus turnos das escalas.`)) {
      return;
    }

    try {
      await db.deleteColaborador(id);
      setColaboradores(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Erro ao excluir colaborador:', err);
      alert('Erro ao excluir colaborador.');
    }
  };

  if (checkingAuth) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin"></div>
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
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-white">Gerenciar Colaboradores</h1>
            <p className="text-sm text-stone-500 dark:text-stone-400">Cadastre e gerencie a equipe da cervejaria</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link 
            href="/admin"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-900 dark:hover:bg-stone-850 text-stone-700 dark:text-stone-300 text-sm font-semibold rounded-xl transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Painel
          </Link>
          {!showForm && (
            <button 
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-accent/10"
            >
              <Plus className="w-4 h-4" />
              Adicionar Colaborador
            </button>
          )}
        </div>
      </header>

      {/* Formulário de Adicionar / Editar */}
      {showForm && (
        <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 mb-8 relative transition-all duration-200 animate-fadeIn">
          <button 
            onClick={handleCancelForm}
            className="absolute top-4 right-4 p-1.5 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-full text-stone-400 hover:text-stone-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <h3 className="font-bold text-lg text-stone-800 dark:text-white mb-6 flex items-center gap-2">
            {editingId ? <Edit2 className="w-5 h-5 text-accent" /> : <Plus className="w-5 h-5 text-accent" />}
            {editingId ? 'Editar Colaborador' : 'Novo Colaborador'}
          </h3>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="collab-name" className="block text-xs font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-2">
                Nome Completo
              </label>
              <input
                id="collab-name"
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: João da Silva"
                className="w-full px-4 py-2.5 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label htmlFor="collab-phone" className="block text-xs font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-2">
                Telefone (WhatsApp)
              </label>
              <input
                id="collab-phone"
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="Ex: (47) 99999-9999"
                className="w-full px-4 py-2.5 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label htmlFor="collab-role" className="block text-xs font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-2">
                Função Padrão
              </label>
              <select
                id="collab-role"
                value={funcao}
                onChange={(e) => setFuncao(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
              >
                <option value="Monitor">Monitor</option>
                <option value="Resgatista">Resgatista</option>
                <option value="Caixa">Caixa</option>
              </select>
            </div>

            <div>
              <label htmlFor="collab-points" className="block text-xs font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-2">
                Pontos (Score Interno)
              </label>
              <input
                id="collab-points"
                type="number"
                min="0"
                max="100"
                value={pontos}
                onChange={(e) => setPontos(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2.5 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
              />
            </div>

            <div className="flex items-center gap-3 md:pt-8">
              <input
                id="collab-active"
                type="checkbox"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
                className="w-5 h-5 rounded border-stone-300 dark:border-stone-800 text-accent focus:ring-accent cursor-pointer"
              />
              <label htmlFor="collab-active" className="text-sm font-semibold text-stone-755 dark:text-stone-300 cursor-pointer select-none">
                Colaborador Ativo (aparece na criação de escalas)
              </label>
            </div>

            {formError && (
              <div className="col-span-1 md:col-span-2 text-xs text-red-500 font-semibold flex items-center gap-1.5 bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                <AlertCircle className="w-4 h-4" />
                {formError}
              </div>
            )}

            <div className="col-span-1 md:col-span-2 flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancelForm}
                className="px-4 py-2 bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-800 dark:text-stone-200 text-sm font-semibold rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saveLoading}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-xl shadow-md transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saveLoading ? 'Salvando...' : 'Salvar Colaborador'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de colaboradores */}
      {loading ? (
        <div className="flex justify-center items-center py-16">
          <div className="w-8 h-8 border-3 border-accent/20 border-t-accent rounded-full animate-spin"></div>
        </div>
      ) : colaboradores.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {colaboradores.map(c => (
            <div 
              key={c.id}
              className={`p-5 rounded-2xl border bg-white dark:bg-stone-900 transition-all ${
                c.ativo 
                  ? 'border-stone-200 dark:border-stone-800/80 shadow-sm' 
                  : 'border-stone-200/50 dark:border-stone-800/40 opacity-60'
              }`}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-stone-100 dark:bg-stone-800 text-accent flex items-center justify-center font-bold text-base">
                    {c.nome.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-800 dark:text-stone-100 text-sm flex items-center gap-2">
                      {c.nome}
                      {!c.ativo && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400 rounded-full font-bold">
                          Inativo
                        </span>
                      )}
                    </h4>
                    <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 bg-accent/10 text-accent text-xs font-semibold rounded-full">
                      <Briefcase className="w-3 h-3" />
                      {c.funcao_padrao}
                    </span>
                    <span className="inline-flex items-center gap-1 mt-1 ml-2 px-2.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold rounded-full">
                      ⭐ {c.pontos ?? 10} pts
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(c)}
                    className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-400 rounded-xl transition-all"
                    title="Editar colaborador"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id, c.nome)}
                    className="p-2 hover:bg-red-500/10 text-red-650 dark:text-red-400 rounded-xl transition-all"
                    title="Excluir colaborador"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Ajuste Rápido de Pontos (Score) */}
              <div className="mt-4 pt-3 border-t border-stone-105 dark:border-stone-800/40 flex items-center justify-between">
                <span className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">Pontuação</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleUpdatePoints(c.id, -2)}
                    className="px-2 py-0.5 bg-red-500/10 hover:bg-red-500/20 text-red-650 dark:text-red-400 text-[10px] font-extrabold uppercase rounded-lg transition-all"
                    title="Falta (Deduz 2 pontos)"
                  >
                    Falta (-2)
                  </button>
                  <button
                    onClick={() => handleUpdatePoints(c.id, -1)}
                    className="w-6 py-0.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-600 dark:text-stone-300 text-[10px] font-bold rounded-lg transition-all"
                    title="Deduzir 1 ponto"
                  >
                    -1
                  </button>
                  <span className="text-xs font-bold text-stone-850 dark:text-stone-100 px-1.5 min-w-[20px] text-center font-mono">
                    {c.pontos ?? 10}
                  </span>
                  <button
                    onClick={() => handleUpdatePoints(c.id, 1)}
                    className="w-6 py-0.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-600 dark:text-stone-300 text-[10px] font-bold rounded-lg transition-all"
                    title="Adicionar 1 ponto"
                  >
                    +1
                  </button>
                  <button
                    onClick={() => handleUpdatePoints(c.id, 2)}
                    className="px-2 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold uppercase rounded-lg transition-all"
                    title="Presença Extra (Adiciona 2 pontos)"
                  >
                    Extra (+2)
                  </button>
                </div>
              </div>

              {c.telefone && (
                <div className="mt-3 pt-2.5 border-t border-stone-100 dark:border-stone-800/40 flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 font-medium">
                  <Phone className="w-3.5 h-3.5 text-stone-400" />
                  <span>{c.telefone}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-stone-50 dark:bg-stone-900/20 border border-stone-200/80 dark:border-stone-800/80 rounded-3xl p-10 text-center space-y-4">
          <Users className="w-12 h-12 text-stone-400 mx-auto" />
          <h3 className="font-bold text-stone-800 dark:text-stone-200">Equipe vazia</h3>
          <p className="text-stone-500 dark:text-stone-400 max-w-sm mx-auto text-sm">
            Nenhum colaborador cadastrado. Clique no botão acima para adicionar o primeiro funcionário.
          </p>
        </div>
      )}
    </div>
  );
}
