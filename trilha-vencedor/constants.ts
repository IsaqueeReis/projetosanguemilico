
import { Mission } from './types';

export const MISSIONS: Mission[] = [
  {
    id: 'm1',
    title: 'Apresentação ao Comando',
    description: 'Configure seu perfil e defina seu objetivo de aprovação.',
    xpReward: 100,
    icon: 'target'
  },
  {
    id: 'm2',
    title: 'Treinamento Básico',
    description: 'Complete suas primeiras 5 horas de estudo líquido.',
    xpReward: 300,
    icon: 'book'
  },
  {
    id: 'm3',
    title: 'Primeiro Combate',
    description: 'Realize o primeiro simulado e obtenha nota superior a 5.0.',
    xpReward: 500,
    icon: 'skull'
  },
  {
    id: 'm4',
    title: 'Especialização Tática',
    description: 'Feche o edital de Direito Constitucional e Penal.',
    xpReward: 1000,
    icon: 'medal'
  },
  {
    id: 'm5',
    title: 'Aprovação Final',
    description: 'Conquiste a farda. Missão cumprida.',
    xpReward: 5000,
    icon: 'trophy'
  }
];
