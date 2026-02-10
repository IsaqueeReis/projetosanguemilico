
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line, CartesianGrid, Legend, AreaChart, Area } from 'recharts';

// Cores para as matérias (Palette variada para distinção)
const SUBJECT_COLORS = [
  '#dc2626', // Red 600
  '#2563eb', // Blue 600
  '#16a34a', // Green 600
  '#d97706', // Amber 600
  '#9333ea', // Purple 600
  '#0891b2', // Cyan 600
  '#db2777', // Pink 600
  '#4f46e5', // Indigo 600
  '#ca8a04', // Yellow 600
  '#059669', // Emerald 600
  '#7c3aed', // Violet 600
  '#be123c', // Rose 700
];

const formatTimeChart = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h}h ${m}m ${s}s`;
};

export const StudyHoursChart = ({ data }: { data: { name: string; hours: number }[] }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
        <XAxis type="number" stroke="#a1a1aa" />
        <YAxis dataKey="name" type="category" width={150} stroke="#a1a1aa" tick={{fontSize: 11}} />
        <Tooltip 
          contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#f4f4f5' }}
          itemStyle={{ color: '#dc2626' }}
        />
        <Bar dataKey="hours" fill="#DC2626" radius={[0, 4, 4, 0]}>
           {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#DC2626' : '#991B1B'} />
            ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export const QuestionPieChart = ({ correct, incorrect }: { correct: number; incorrect: number }) => {
  // Sanitização robusta dos dados para evitar NaN ou undefined
  const safeCorrect = Number(correct) || 0;
  const safeIncorrect = Number(incorrect) || 0;
  const total = safeCorrect + safeIncorrect;

  // Dados com cores fixas para garantir consistência mesmo filtrando
  const rawData = [
    { name: 'Acertos', value: safeCorrect, color: '#16a34a' }, // Green 600
    { name: 'Erros', value: safeIncorrect, color: '#dc2626' },   // Red 600
  ];

  const hasData = total > 0;
  
  // Filtra fatias com valor 0 para evitar o bug visual do anel quebrado (artefato de padding)
  const displayData = hasData 
    ? rawData.filter(d => d.value > 0)
    : [{ name: 'Sem dados', value: 1, color: '#27272a' }];

  const CustomTooltip = ({ active, payload }: any) => {
      if (!hasData) return null;
      if (active && payload && payload.length) {
          return (
              <div className="bg-[#18181b] border border-zinc-800 p-2 rounded shadow-xl text-white text-xs">
                  <p className="font-bold mb-1">{payload[0].name}</p>
                  <p>{payload[0].value} questões</p>
              </div>
          );
      }
      return null;
  };

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={displayData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          // Só aplica padding se houver mais de uma fatia visível
          paddingAngle={displayData.length > 1 ? 5 : 0}
          dataKey="value"
          stroke="none"
        >
          {displayData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend verticalAlign="bottom" height={36} iconType="circle"/>
      </PieChart>
    </ResponsiveContainer>
  );
};

export const PrecisionWaveChart = ({ data }: { data: { date: string; accuracy: number }[] }) => {
    // Se não houver dados suficientes, cria um dado dummy para mostrar a linha zerada
    const chartData = data.length > 0 ? data : [{ date: 'Hoje', accuracy: 0 }];

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-[#18181b] border border-zinc-800 p-2 rounded shadow-xl text-white text-xs">
                    <p className="font-bold mb-1 text-zinc-400">{label}</p>
                    <p className="text-lg font-bold text-green-500">{payload[0].value}%</p>
                </div>
            );
        }
        return null;
    };

    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorAccuracy" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorWave2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} opacity={0.5} />
                <XAxis 
                    dataKey="date" 
                    stroke="#52525b" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    interval="preserveStartEnd"
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#52525b', strokeWidth: 1, strokeDasharray: '3 3' }} />
                
                {/* Onda secundária decorativa (efeito de eco) */}
                <Area 
                    type="monotone" 
                    dataKey="accuracy" 
                    stroke="none" 
                    fill="url(#colorWave2)" 
                    fillOpacity={1}
                    className="blur-[2px]" 
                />
                
                {/* Onda principal */}
                <Area 
                    type="monotone" 
                    dataKey="accuracy" 
                    stroke="#16a34a" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorAccuracy)" 
                    activeDot={{ r: 6, strokeWidth: 0, fill: '#fff' }}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
};

export const StudyDistributionChart = ({ data }: { data: { name: string; value: number }[] }) => {
    // data.value está em segundos
    const hasData = data.length > 0;
    const displayData = hasData ? data : [{ name: 'Sem estudo', value: 1 }];

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-[#18181b] border border-zinc-800 p-2 rounded shadow-xl text-white text-xs">
                    <p className="font-bold mb-1">{payload[0].name}</p>
                    <p>{formatTimeChart(payload[0].value)}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <ResponsiveContainer width="100%" height={300}>
            <PieChart>
                <Pie
                    data={displayData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                >
                    {displayData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={hasData ? SUBJECT_COLORS[index % SUBJECT_COLORS.length] : '#27272a'} />
                    ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                    layout="vertical" 
                    verticalAlign="middle" 
                    align="right"
                    wrapperStyle={{ fontSize: '10px', maxWidth: '120px' }} 
                />
            </PieChart>
        </ResponsiveContainer>
    );
};

export const EvolutionChart = ({ data, color = "#DC2626" }: { data: { date: string; value: number }[], color?: string }) => {
    return (
        <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.3} />
                <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} tickFormatter={(val) => val.slice(5)} />
                <YAxis stroke="#a1a1aa" fontSize={12} />
                <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#f4f4f5' }}
                />
                <Line type="monotone" dataKey="value" stroke={color} strokeWidth={3} dot={{r: 4, fill: color}} activeDot={{ r: 6 }} />
            </LineChart>
        </ResponsiveContainer>
    );
};
