import { useCallback, useState } from 'react';

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
      return { playerNumber: String(parsed.playerNumber), playerName: String(parsed.playerName) };
    }
  } catch {
    // ignore
  }
  return null;
}

function saveToStorage(player: MyPlayer) {
  try {
    if (player) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(player));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

export function useMyPlayer() {
  const [myPlayer, setMyPlayerState] = useState<MyPlayer>(loadFromStorage);

  const setMyPlayer = useCallback((player: MyPlayer) => {
    setMyPlayerState(player);
    saveToStorage(player);
  }, []);

  const pinPlayer = useCallback((playerNumber: string, playerName: string) => {
    setMyPlayer({ playerNumber, playerName });
  }, []);

  const unpinPlayer = useCallback(() => {
    setMyPlayer(null);
  }, []);

  const isPinned = useCallback(
    (playerNumber: string, playerName: string) =>
      myPlayer?.playerNumber === String(playerNumber) && myPlayer?.playerName === playerName,
    [myPlayer],
  );

  return { myPlayer, setMyPlayer, pinPlayer, unpinPlayer, isPinned };
}
