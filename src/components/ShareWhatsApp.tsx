'use client';

import React from 'react';
import { Share2 } from 'lucide-react';
import { getDisplayFuncao } from '../lib/utils';
import { EscalaWithItens } from '../types/database';

interface ShareWhatsAppProps {
  escala: EscalaWithItens;
}

export default function ShareWhatsApp({ escala }: ShareWhatsAppProps) {
  const formatText = () => {
    // Format date DD/MM
    const formatDate = (dateStr: string) => {
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      return `${parts[2]}/${parts[1]}`;
    };

    const startFormatted = formatDate(escala.data_inicio);
    const endFormatted = formatDate(escala.data_fim);

    let text = `🧗‍♂️ *Escala Arvorismo GutBrau - Semanal (${startFormatted} a ${endFormatted})* 🧗‍♂️\n\n`;

    // Group items by date
    const itemsByDate: { [date: string]: typeof escala.itens } = {};
    escala.itens.forEach((item) => {
      if (!itemsByDate[item.data]) {
        itemsByDate[item.data] = [];
      }
      itemsByDate[item.data].push(item);
    });

    // Sort dates
    const sortedDates = Object.keys(itemsByDate).sort();

    if (sortedDates.length === 0) {
      text += 'Nenhum turno cadastrado nesta escala.\n';
    } else {
      sortedDates.forEach((dateStr) => {
        // Get day name in Portuguese
        const dateObj = new Date(dateStr + 'T00:00:00');
        const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
        const dayFormatted = dayName.charAt(0).toUpperCase() + dayName.slice(1);
        
        text += `📅 *${dayFormatted} (${formatDate(dateStr)})*\n`;

        const dateObjDay = new Date(dateStr + 'T00:00:00');
        const dayOfWeek = dateObjDay.getDay(); // 0 = Sunday, 6 = Saturday
        const isSat = dayOfWeek === 6;
        const isSun = dayOfWeek === 0;
        const isDayCancelled = (isSat && escala.sabado_cancelado) || (isSun && escala.domingo_cancelado);

        if (isDayCancelled) {
          text += `❌ *OPERÇÃO SUSPENSA (CLIMA / FORÇA MAIOR)*\n\n`;
        } else {
          itemsByDate[dateStr].forEach((item) => {
            const rawName = item.colaborador?.nome || 'Colaborador';
            const collabName = item.treinamento ? `${rawName}***` : rawName;
            const displayFuncao = getDisplayFuncao(item.funcao, item.colaborador_id, itemsByDate[dateStr]);
            text += `• *${collabName}*: ${displayFuncao} (${item.turno})\n`;
          });
          text += '\n';
        }
      });
    }

    if (escala.observacoes) {
      text += `💬 *Observações:*\n_${escala.observacoes.trim()}_\n\n`;
    }

    const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
    if (appUrl) {
      text += `🔗 Ver escala completa: ${appUrl}\n`;
    }

    return encodeURIComponent(text);
  };

  const handleShare = () => {
    const encodedText = formatText();
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl shadow-md transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 dark:focus:ring-offset-stone-900"
    >
      <svg
        className="w-5 h-5 fill-current"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.458L0 24zm6.035-3.655l.407.242c1.627.966 3.486 1.476 5.502 1.478 5.922 0 10.743-4.814 10.746-10.738.002-2.871-1.111-5.569-3.136-7.595C17.587 1.706 14.894.595 12.023.595c-5.925 0-10.748 4.814-10.75 10.74-.001 2.01.524 3.971 1.517 5.716l.271.474-1.002 3.662 3.754-.984zm11.758-7.925c-.322-.161-1.905-.94-2.202-1.048-.297-.108-.514-.162-.73.162-.216.324-.836 1.048-1.025 1.264-.19.216-.379.243-.702.082-.322-.161-1.36-.501-2.59-1.602-.958-.854-1.604-1.91-1.792-2.235-.189-.323-.02-.497.142-.658.145-.145.323-.379.485-.568.162-.19.216-.324.324-.54.108-.216.054-.405-.027-.567-.08-.162-.73-1.758-1.002-2.407-.265-.637-.53-.55-.73-.56-.189-.01-.405-.011-.62-.011-.217 0-.568.082-.866.406-.298.324-1.137 1.109-1.137 2.705 0 1.596 1.163 3.138 1.325 3.354.162.216 2.29 3.498 5.547 4.901.775.333 1.378.532 1.85.682.779.248 1.488.213 2.048.129.624-.093 1.905-.779 2.176-1.493.271-.714.271-1.326.19-1.49-.081-.163-.298-.27-.62-.432z" />
      </svg>
      Compartilhar no WhatsApp
    </button>
  );
}
