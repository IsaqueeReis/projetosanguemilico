
import React, { useState, useEffect } from 'react';
import { MISSIONS } from './constants';
import { MissionIcon } from './components/MissionIcon';
import { MissionStatus } from './types';
import { TrilhaAdapter, TrilhaResponse } from './trilhaAdapter';
import { PremiumLock } from './PremiumLock';

// Estilos inline para garantir isolamento e tema Dark/Militar
const containerStyle = "w-full max-w-4xl mx-auto p-6 bg-[#09090b] text-zinc-200 min-h-screen font-sans border border-zinc-900 rounded-xl relative overflow-hidden";
const headerStyle = "mb-12 text-center relative";
const titleStyle = "text-4xl font-black text-white tracking-tighter uppercase mb-2 drop-shadow-lg";
const subTitleStyle = "text-zinc-500 text-sm uppercase tracking-[0.2em] font-bold";
const progressContainerStyle = "mt-8 w-full bg-zinc-900 rounded-full h-3 border border-zinc-800 relative overflow-hidden";
const progressBarStyle = "absolute top-0 left-0 h-full bg-red-600 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(220,38,38,0.5)]";

const cardStyle = "relative pl-8 py-6 border-l-2 transition-all duration-300 hover:bg-zinc-900/30 rounded-r-xl";
const buttonStyle = "mt-4 px-6 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all transform active:scale-95";

export const TrilhaVencedor = () => {
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  // Estado local controlado para dados externos (Adapter)
  const [trilhaData, setTrilhaData] = useState<TrilhaResponse | null>(null);

  // Hook de efeito para buscar dados via Adapter sem bloquear a renderização
  useEffect(() => {
    const syncTrilha = async () => {
      try {
        let userId = 'unknown';
        const storedUser = localStorage.getItem('current_user');
        if (storedUser) {
            userId = JSON.parse(storedUser).id;
        }

        const response = await TrilhaAdapter.getTrilhaByStudentId(userId);

        if (response && response.hasCustomPlan) {
            setTrilhaData(response);
        } else {
            setTrilhaData(null);
        }
      } catch (err) {
        setTrilhaData(null);
      }
    };

    syncTrilha();
  }, []);

  const progress = Math.round((completedIds.length / MISSIONS.length) * 100);

  // Se este componente renderizou, significa que o usuário NÃO tem plano premium
  // Portanto, mostramos o PremiumLock
  return (
    <div className={containerStyle}>
      {/* Componente de Bloqueio Sobreposto */}
      <PremiumLock />

      {/* Conteúdo da Trilha (Embaçado/Bloqueado) */}
      <div className="filter blur-md pointer-events-none select-none opacity-50">
        <header className={headerStyle}>
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-1 bg-red-600 blur-[2px]"></div>
          <h1 className={titleStyle}>
            Trilha do <span className="text-red-600">Vencedor</span>
          </h1>
          <p className={subTitleStyle}>Mapa Tático Operacional</p>
          
          <div className={progressContainerStyle}>
            <div 
              className={progressBarStyle}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-3 flex justify-between text-[10px] font-mono font-bold text-zinc-600 uppercase">
            <span>Recrutamento</span>
            <span className="text-zinc-600">
              0% DA MISSÃO CUMPRIDA
            </span>
            <span>Aprovação</span>
          </div>
        </header>

        <div className="space-y-4">
          {MISSIONS.map((mission, index) => {
            return (
              <div 
                key={mission.id} 
                className={`${cardStyle} border-zinc-800 opacity-60`}
              >
                {/* Timeline Dot */}
                <div 
                  className="absolute left-[-9px] top-8 w-4 h-4 rounded-full border-2 z-10 bg-[#09090b] border-zinc-800"
                />

                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-zinc-800 text-zinc-600">
                      <MissionIcon type={mission.icon} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold uppercase tracking-tight text-zinc-500">
                        {mission.title}
                      </h3>
                      <p className="text-zinc-600 text-sm mt-1 max-w-md font-medium">
                        {mission.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right hidden sm:block">
                    <span className="text-xs font-mono font-bold px-3 py-1 rounded border text-zinc-600 bg-zinc-900 border-zinc-800">
                      +{mission.xpReward} XP
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TrilhaVencedor;
