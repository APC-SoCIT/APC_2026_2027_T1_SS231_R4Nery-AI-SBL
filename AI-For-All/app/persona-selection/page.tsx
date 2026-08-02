'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/sessionContext';
import { PATH_PERSONAS, PERSONA_DETAILS } from '@/lib/pathConfig';
import { Header } from '@/components/Header';
import { Persona } from '@/lib/types';
import styles from './persona-selection.module.css';

const ALL_PERSONAS = [
  { id: 'avatar-1' as Persona, emoji: '🧙' },
  { id: 'avatar-2' as Persona, emoji: '⚔️' },
  { id: 'avatar-3' as Persona, emoji: '🐉' },
  { id: 'avatar-4' as Persona, emoji: '🧝' },
];

export default function PersonaSelectionPage() {
  const router = useRouter();
  const { session, selectPersona, startModule } = useSession();
  const [selected, setSelected] = useState<Persona | null>(null);

  const filteredPersonas = useMemo(() => {
    const selectedPath = session.selectedPath;
    if (!selectedPath) {
      router.push('/path-selection');
      return [];
    }

    const personas = PATH_PERSONAS[selectedPath];
    return ALL_PERSONAS.filter((p) => personas.includes(p.id));
  }, [session.selectedPath, router]);

  const handleConfirm = () => {
    if (selected) {
      selectPersona(selected);
      startModule('module-1');
      router.push('/story/module-1');
    }
  };

  return (
    <>
      <Header title="Choose Your Guide" showHome />
      <main className={styles.container}>
        <div className={styles.content}>
          <p className={styles.intro}>
            Select your AI guide for this journey:
          </p>

          <div className={styles.grid}>
            {filteredPersonas.map((persona) => (
              <button
                key={persona.id}
                className={`${styles.personaCard} ${
                  selected === persona.id ? styles.selected : ''
                }`}
                onClick={() => setSelected(persona.id)}
                type="button"
              >
                <div className={styles.emoji}>{persona.emoji}</div>
                <h3 className={styles.name}>{PERSONA_DETAILS[persona.id].name}</h3>
                <p className={styles.description}>{PERSONA_DETAILS[persona.id].description}</p>
              </button>
            ))}
          </div>

          {selected && (
            <button
              className={styles.confirmBtn}
              onClick={handleConfirm}
              type="button"
            >
              Confirm & Start Journey ✨
            </button>
          )}

          {!selected && (
            <p className={styles.hint}>
              Choose an avatar to continue →
            </p>
          )}
        </div>
      </main>
    </>
  );
}
