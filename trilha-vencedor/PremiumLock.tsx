
import React from 'react';

const whatsAppLink = "https://wa.me/5579991215028?text=Ol%C3%A1%2C%20gostaria%20de%20adquirir%20a%20Mentoria%20Premium%20do%20Sangue%20Milico%20por%20R%24%20299%2C97.";

export const PremiumLock = () => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop escuro com blur */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm rounded-xl"></div>
      
      {/* Cartão de Vendas */}
      <div className="relative z-10 bg-[#09090b] border-2 border-red-600 rounded-2xl p-8 max-w-md w-full text-center shadow-[0_0_50px_rgba(220,38,38,0.2)] animate-fade-in">
        
        {/* Ícone Cadeado */}
        <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-zinc-800 shadow-inner">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>

        <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">
          Acesso <span className="text-red-600">Restrito</span>
        </h2>
        
        <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
          Esta área é exclusiva para alunos da <strong>Mentoria Individual</strong>. Desbloqueie seu potencial máximo com acompanhamento personalizado.
        </p>

        <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800 mb-6">
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">Valor do Investimento</p>
          <p className="text-3xl font-black text-white">R$ 299,97</p>
        </div>

        <a 
          href={whatsAppLink}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all transform hover:scale-105 shadow-lg shadow-green-900/20 group"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white" className="group-hover:animate-bounce">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
          COMPRE AGORA
        </a>
        <p className="mt-3 text-[10px] text-zinc-500 uppercase font-bold tracking-wide">
          Atendimento direto via WhatsApp
        </p>
      </div>
    </div>
  );
};
