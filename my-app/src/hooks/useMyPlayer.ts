import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'korebaps_my_player';

export type MyPlayer = {
  playerNumber: string;
  playerName: string;
} | null;

function loadFromStorage(): MyPlayer {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { playerNumber?: string; playerName?: string };
    if (parsed?.playerNumber && parsed?.playerName) {
      return { playerNumber: parsed.playerNumber, playerName: parsed.playerName };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function useMyPlayer() {
  const [myPlayer, setMyPlayer] = useState<MyPlayer>(loadFromStorage);

  useEffect(() => {
    const handleStorage = () => setMyPlayer(loadFromStorage());
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const setMyPlayerPersist = useCallback((player: MyPlayer) => {
    if (player) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(player));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setMyPlayer(player);
  }, []);

  const pinPlayer = useCallback((playerNumber: string, playerName: string) => {
    setMyPlayerPersist({ playerNumber, playerName });
  }, [setMyPlayerPersist]);

  const unpinPlayer = useCallback(() => {
    setMyPlayerPersist(null);
  }, [setMyPlayerPersist]);

  const isPinned = useCallback(
    (playerNumber: string, playerName: string) =>
      myPlayer?.playerNumber === playerNumber && myPlayer?.playerName === playerName,
    [myPlayer],
  );

  return { myPlayer, pinPlayer, unpinPlayer, isPinned };
}
