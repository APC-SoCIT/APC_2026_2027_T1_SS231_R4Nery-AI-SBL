import { Persona, AIPath } from './types';

export const PATH_PERSONAS: Record<AIPath, Persona[]> = {
  logical: ['avatar-1', 'avatar-3'], // Tech Sage, Data Dragon
  creative: ['avatar-4', 'avatar-2'], // Pixel Elf, Quantum Knight
};

export const PERSONA_DETAILS: Record<Persona, { name: string; description: string }> = {
  'avatar-1': { name: 'Tech Sage', description: 'Wise and experienced' },
  'avatar-2': { name: 'Quantum Knight', description: 'Bold and adventurous' },
  'avatar-3': { name: 'Data Dragon', description: 'Curious and powerful' },
  'avatar-4': { name: 'Pixel Elf', description: 'Creative and quick' },
};

export const PATH_DETAILS: Record<AIPath, { title: string; icon: string; description: string }> = {
  logical: {
    title: 'Logical Path',
    icon: '💡',
    description: "I don't know anything about AI yet. Let me start from the beginning.",
  },
  creative: {
    title: 'Creative Path',
    icon: '🚀',
    description: 'I know the basics of AI. Show me something more.',
  },
};
