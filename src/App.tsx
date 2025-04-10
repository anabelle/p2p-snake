import React, { useEffect, useState } from 'react';
import GameCanvas from './components/GameCanvas';
import GameInfo from './components/GameInfo';
import GameControls from './components/GameControls';
import { useGame } from './hooks/useGame';
import { p2pService } from './services/p2pService';

const App: React.FC = () => {
  const [connectedPlayers, setConnectedPlayers] = useState<number>(0);
  
  const {
    gameState,
    localPlayerId,
    isGameRunning,
    startGame,
    pauseGame,
    restartGame,
  } = useGame();
  
  // Update connected players count
  useEffect(() => {
    const updateConnectedPlayers = () => {
      const count = p2pService.getConnectedPeers().length + 1; // +1 for local player
      setConnectedPlayers(count);
    };
    
    // Initial update
    updateConnectedPlayers();
    
    // Set up event listeners for peer connections
    p2pService.onPeerConnected(() => {
      updateConnectedPlayers();
    });
    
    p2pService.onPeerDisconnected(() => {
      updateConnectedPlayers();
    });
    
    // Clean up on unmount
    return () => {
      // No specific cleanup needed as p2pService cleanup is handled in useGame
    };
  }, []);
  
  return (
    <div className="game-container">
      <GameInfo
        gameState={gameState}
        localPlayerId={localPlayerId}
        connectedPlayers={connectedPlayers}
      />
      <GameCanvas
        gameState={gameState}
        localPlayerId={localPlayerId}
      />
      <GameControls
        isGameRunning={isGameRunning}
        onStart={startGame}
        onPause={pauseGame}
        onRestart={restartGame}
      />
    </div>
  );
};

export default App; 