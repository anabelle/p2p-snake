import { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  GameState, 
  Snake, 
  Direction, 
  Food, 
  PowerUp, 
  PeerMessage, 
  Point
} from '../utils/types';
import { 
  GRID_SIZE, 
  CELL_SIZE, 
  GAME_SPEED, 
  getOccupiedPositions,
  generateNewSnake,
  generateFood,
  generatePowerUp,
  moveSnake,
  hasCollidedWithWall,
  hasCollidedWithSnake,
  hasEatenFood,
  hasCollectedPowerUp,
  applyPowerUpEffect,
  removeExpiredPowerUps,
  getSpeedFactor,
  getScoreMultiplier,
  isInvincible,
  updateGameState,
  mergeGameStates
} from '../utils/gameUtils';
import { p2pService } from '../services/p2pService';

interface UseGameReturn {
  gameState: GameState;
  localPlayerId: string;
  isGameRunning: boolean;
  startGame: () => void;
  pauseGame: () => void;
  restartGame: () => void;
  handleKeyDown: (event: KeyboardEvent) => void;
}

export const useGame = (): UseGameReturn => {
  const [localPlayerId, setLocalPlayerId] = useState<string>('');
  const [isGameRunning, setIsGameRunning] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize game state with default values
  const [gameState, setGameState] = useState<GameState>({
    snakes: [],
    food: [],
    powerUps: [],
    gridSize: GRID_SIZE,
    timestamp: Date.now(),
    sequence: 0,
  });
  
  // Handle P2P connection and message handling
  useEffect(() => {
    const initP2P = async () => {
      try {
        const playerId = await p2pService.init();
        setLocalPlayerId(playerId);
        
        // Set up message handlers
        p2pService.onMessage(handlePeerMessage);
        p2pService.onPeerConnected(handlePeerConnected);
        p2pService.onPeerDisconnected(handlePeerDisconnected);
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize P2P service:', error);
      }
    };
    
    initP2P();
    
    // Clean up on unmount
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
      
      p2pService.cleanup();
    };
  }, []);
  
  // Initialize the game when a player joins
  useEffect(() => {
    if (isInitialized && localPlayerId && !gameState.snakes.length) {
      // Create a new game state with the local player's snake
      initializeGameState();
    }
  }, [isInitialized, localPlayerId]);
  
  // Handle keyboard input
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isGameRunning || !localPlayerId) return;
      
      const localSnake = gameState.snakes.find((s) => s.id === localPlayerId);
      if (!localSnake) return;
      
      let newDirection: Direction | null = null;
      
      switch (event.key) {
        case 'ArrowUp':
          if (localSnake.direction !== Direction.DOWN) {
            newDirection = Direction.UP;
          }
          break;
        case 'ArrowDown':
          if (localSnake.direction !== Direction.UP) {
            newDirection = Direction.DOWN;
          }
          break;
        case 'ArrowLeft':
          if (localSnake.direction !== Direction.RIGHT) {
            newDirection = Direction.LEFT;
          }
          break;
        case 'ArrowRight':
          if (localSnake.direction !== Direction.LEFT) {
            newDirection = Direction.RIGHT;
          }
          break;
      }
      
      if (newDirection) {
        // Update the local snake direction
        setGameState((prevState) => {
          const updatedSnakes = prevState.snakes.map((snake) => {
            if (snake.id === localPlayerId) {
              return { ...snake, direction: newDirection! };
            }
            return snake;
          });
          
          return { ...prevState, snakes: updatedSnakes };
        });
        
        // Broadcast the direction change to peers
        p2pService.broadcastMessage({
          type: 'DIRECTION_CHANGE',
          data: { direction: newDirection },
          timestamp: Date.now(),
          sequence: gameState.sequence + 1,
        });
      }
    },
    [gameState, isGameRunning, localPlayerId]
  );
  
  // Start the game
  const startGame = useCallback(() => {
    setIsGameRunning(true);
    
    // Start the game loop
    if (!gameLoopRef.current) {
      gameLoopRef.current = setInterval(updateGame, GAME_SPEED);
    }
  }, []);
  
  // Pause the game
  const pauseGame = useCallback(() => {
    setIsGameRunning(false);
    
    // Stop the game loop
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
    }
  }, []);
  
  // Restart the game
  const restartGame = useCallback(() => {
    pauseGame();
    initializeGameState();
    startGame();
  }, [pauseGame, startGame]);
  
  // Initialize the game state
  const initializeGameState = useCallback(() => {
    const initialGameState: GameState = {
      snakes: [],
      food: [],
      powerUps: [],
      gridSize: GRID_SIZE,
      timestamp: Date.now(),
      sequence: 0,
    };
    
    // Create a snake for the local player
    const localSnake = generateNewSnake(
      localPlayerId,
      GRID_SIZE,
      []
    );
    
    initialGameState.snakes.push(localSnake);
    
    // Add some initial food
    const foodCount = 3;
    for (let i = 0; i < foodCount; i++) {
      const occupiedPositions = getOccupiedPositions(
        initialGameState.snakes,
        initialGameState.food,
        initialGameState.powerUps
      );
      
      const food = generateFood(GRID_SIZE, occupiedPositions);
      initialGameState.food.push(food);
    }
    
    // Add a power-up
    const occupiedPositions = getOccupiedPositions(
      initialGameState.snakes,
      initialGameState.food,
      initialGameState.powerUps
    );
    
    const powerUp = generatePowerUp(GRID_SIZE, occupiedPositions);
    initialGameState.powerUps.push(powerUp);
    
    setGameState(initialGameState);
    
    // Broadcast the initial game state to peers
    p2pService.broadcastMessage({
      type: 'STATE_UPDATE',
      data: initialGameState,
      timestamp: Date.now(),
      sequence: 0,
    });
  }, [localPlayerId]);
  
  // Update the game state
  const updateGame = useCallback(() => {
    if (!isGameRunning) return;
    
    setGameState((prevState) => {
      const newState = { ...prevState };
      newState.timestamp = Date.now();
      newState.sequence += 1;
      
      // Update each snake
      const updatedSnakes: Snake[] = [];
      let foodEaten: Food | null = null;
      let powerUpCollected: PowerUp | null = null;
      
      for (const snake of prevState.snakes) {
        // Check if this is the local player's snake
        const isLocalSnake = snake.id === localPlayerId;
        
        // Skip snakes that aren't the local player's
        if (!isLocalSnake) {
          updatedSnakes.push(snake);
          continue;
        }
        
        // Get the speed factor based on power-ups
        const speedFactor = getSpeedFactor(snake);
        
        // Move the snake
        const movedSnake = moveSnake(snake, false, speedFactor);
        
        // Check for collisions with the wall
        if (
          hasCollidedWithWall(movedSnake.body[0], prevState.gridSize) && 
          !isInvincible(movedSnake)
        ) {
          // The snake died
          continue;
        }
        
        // Check for collisions with other snakes
        if (
          hasCollidedWithSnake(movedSnake.body[0], prevState.snakes, movedSnake.id) && 
          !isInvincible(movedSnake)
        ) {
          // The snake died
          continue;
        }
        
        // Check if the snake has eaten food
        foodEaten = hasEatenFood(movedSnake.body[0], prevState.food);
        
        if (foodEaten) {
          // Grow the snake
          const grownSnake = moveSnake(snake, true, speedFactor);
          
          // Update the score
          const scoreMultiplier = getScoreMultiplier(grownSnake);
          grownSnake.score += foodEaten.value * scoreMultiplier;
          
          updatedSnakes.push(grownSnake);
        } else {
          updatedSnakes.push(movedSnake);
        }
        
        // Check if the snake has collected a power-up
        powerUpCollected = hasCollectedPowerUp(movedSnake.body[0], prevState.powerUps);
        
        if (powerUpCollected) {
          // Apply the power-up effect
          const powerUpSnakeIndex = updatedSnakes.findIndex((s) => s.id === movedSnake.id);
          
          if (powerUpSnakeIndex !== -1) {
            const updatedSnake = applyPowerUpEffect(
              updatedSnakes[powerUpSnakeIndex],
              powerUpCollected
            );
            
            updatedSnakes[powerUpSnakeIndex] = updatedSnake;
          }
        }
      }
      
      // Update the snakes in the game state
      newState.snakes = updatedSnakes;
      
      // Remove eaten food
      if (foodEaten) {
        newState.food = prevState.food.filter(
          (f) => f.position.x !== foodEaten!.position.x || 
                 f.position.y !== foodEaten!.position.y
        );
        
        // Add a new food
        const occupiedPositions = getOccupiedPositions(
          newState.snakes,
          newState.food,
          newState.powerUps
        );
        
        const newFood = generateFood(prevState.gridSize, occupiedPositions);
        newState.food.push(newFood);
      }
      
      // Remove collected power-ups
      if (powerUpCollected) {
        newState.powerUps = prevState.powerUps.filter(
          (p) => p.position.x !== powerUpCollected!.position.x || 
                 p.position.y !== powerUpCollected!.position.y
        );
        
        // Occasionally add a new power-up
        if (Math.random() < 0.3) {
          const occupiedPositions = getOccupiedPositions(
            newState.snakes,
            newState.food,
            newState.powerUps
          );
          
          const newPowerUp = generatePowerUp(prevState.gridSize, occupiedPositions);
          newState.powerUps.push(newPowerUp);
        }
      }
      
      // Broadcast the updated game state to peers
      p2pService.broadcastMessage({
        type: 'STATE_UPDATE',
        data: newState,
        timestamp: Date.now(),
        sequence: newState.sequence,
      });
      
      return newState;
    });
  }, [isGameRunning, localPlayerId]);
  
  // Handle peer messages
  const handlePeerMessage = useCallback((message: PeerMessage) => {
    switch (message.type) {
      case 'STATE_UPDATE':
        const remoteState: GameState = message.data;
        
        setGameState((localState) => {
          return mergeGameStates(localState, remoteState, localPlayerId);
        });
        break;
        
      case 'DIRECTION_CHANGE':
        const { direction } = message.data;
        
        setGameState((prevState) => {
          const updatedSnakes = prevState.snakes.map((snake) => {
            if (snake.id === message.senderId) {
              return { ...snake, direction };
            }
            return snake;
          });
          
          return { ...prevState, snakes: updatedSnakes };
        });
        break;
        
      case 'PLAYER_JOIN':
        // A new player has joined, share our game state with them
        p2pService.sendMessageToPeer(message.senderId, {
          type: 'STATE_UPDATE',
          data: gameState,
          timestamp: Date.now(),
          sequence: gameState.sequence,
        });
        break;
        
      case 'PLAYER_LEAVE':
        // A player has left, remove their snake
        setGameState((prevState) => {
          const updatedSnakes = prevState.snakes.filter((snake) => snake.id !== message.senderId);
          
          return { ...prevState, snakes: updatedSnakes };
        });
        break;
    }
  }, [gameState, localPlayerId]);
  
  // Handle peer connected event
  const handlePeerConnected = useCallback((peerId: string) => {
    // Add the peer's snake to the game
    setGameState((prevState) => {
      // Check if the peer already has a snake
      const peerSnakeExists = prevState.snakes.some((snake) => snake.id === peerId);
      
      if (peerSnakeExists) {
        return prevState;
      }
      
      // Create a new snake for the peer
      const occupiedPositions = getOccupiedPositions(
        prevState.snakes,
        prevState.food,
        prevState.powerUps
      );
      
      const peerSnake = generateNewSnake(peerId, prevState.gridSize, occupiedPositions);
      
      return {
        ...prevState,
        snakes: [...prevState.snakes, peerSnake],
      };
    });
    
    // Share the current game state with the new peer
    p2pService.sendMessageToPeer(peerId, {
      type: 'STATE_UPDATE',
      data: gameState,
      timestamp: Date.now(),
      sequence: gameState.sequence,
    });
  }, [gameState]);
  
  // Handle peer disconnected event
  const handlePeerDisconnected = useCallback((peerId: string) => {
    // Remove the peer's snake from the game
    setGameState((prevState) => {
      const updatedSnakes = prevState.snakes.filter((snake) => snake.id !== peerId);
      
      return { ...prevState, snakes: updatedSnakes };
    });
  }, []);
  
  // Add event listener for keyboard input
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
  
  return {
    gameState,
    localPlayerId,
    isGameRunning,
    startGame,
    pauseGame,
    restartGame,
    handleKeyDown,
  };
}; 