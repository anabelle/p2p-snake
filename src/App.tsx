import React, { useEffect, useRef, useState } from 'react';
// import * as netplayjs from 'netplayjs'; // Keep if NetplayAdapter types are needed standalone
import { NetplayAdapter } from './game/network/NetplayAdapter';
import { Snake, GameState, Direction } from './game/state/types'; // Import Snake and GameState
import io, { Socket } from 'socket.io-client'; // Import socket.io-client
import SimplePeer from 'simple-peer'; // Import simple-peer
import { v4 as uuidv4 } from 'uuid'; // For generating potential local ID

// Shim for NetplayPlayer interface (only need getID)
interface ShimPlayer {
  getID: () => string;
}

// Define a simple input structure compatible with DefaultInput's usage
interface SimpleInput {
  // dx: number; // -1, 0, or 1 - Removed, use arrowKeys directly
  // dy: number; // -1, 0, or 1 - Removed, use arrowKeys directly
  arrowKeys: () => { x: number; y: number };
  // Add other fields if NetplayAdapter's DefaultInput usage needs them
}

// Define peer connection state
interface PeerConnection {
  peer: SimplePeer.Instance;
  peerID: string;
  connected: boolean;
  // Buffer for inputs received from this peer before the next tick
  // Store the raw dx/dy received, convert to arrowKeys format when ticking
  inputBuffer?: { dx: number; dy: number }; 
}

// Helper to create a shim player object
const createShimPlayer = (id: string): ShimPlayer => ({
  getID: () => id,
});

const App: React.FC = () => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  // Refs for core components
  const socketRef = useRef<Socket | null>(null);
  const peersRef = useRef<Map<string, PeerConnection>>(new Map());
  const localPlayerIdRef = useRef<string>(uuidv4()); // Generate a temporary local ID
  const gameAdapterRef = useRef<NetplayAdapter | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number>();

  // State to trigger re-renders if needed (e.g., show connection status)
  const [isConnected, setIsConnected] = useState(false);
  const [peerCount, setPeerCount] = useState(0);

  // --- Input State --- 
  // Keep state for potential UI updates, but use ref for loop access
  const [_, setLocalInputStateUI] = useState({ dx: 0, dy: 0 }); // State for triggering re-renders if needed
  const localInputStateRef = useRef({ dx: 0, dy: 0 }); // Ref for direct access in loop/handlers
  const pressedKeysRef = useRef<Set<string>>(new Set());

  // --- New State for Host Logic ---
  const [isHost, setIsHost] = useState(false);
  const [hostId, setHostId] = useState<string | null>(null);

  // --- Input Event Listeners (Update to use Ref) ---
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      console.log(`KEYDOWN Event: key=${event.key}`);
      let changed = false;
      // Read and potentially modify the ref's current value
      let newState = { ...localInputStateRef.current }; 
      if (!pressedKeysRef.current.has(event.key)) {
          pressedKeysRef.current.add(event.key);
          switch (event.key) {
              case 'ArrowUp':    newState.dy = 1; changed = true; break;
              case 'ArrowDown':  newState.dy = -1; changed = true; break;
              case 'ArrowLeft':  newState.dx = -1; changed = true; break;
              case 'ArrowRight': newState.dx = 1; changed = true; break;
          }
      }
      if (changed) {
          // Update the ref directly
          localInputStateRef.current = newState;
          console.log("KEYDOWN - Input Ref updated to:", localInputStateRef.current);
          // Optionally update state if UI needs to react
          // setLocalInputStateUI(newState); 
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
       console.log(`KEYUP Event: key=${event.key}`);
       let changed = false;
       // Read and potentially modify the ref's current value
       let newState = { ...localInputStateRef.current };
       if (pressedKeysRef.current.has(event.key)) {
           pressedKeysRef.current.delete(event.key);
           newState.dx = 0; 
           newState.dy = 0;
           if (pressedKeysRef.current.has('ArrowLeft')) newState.dx = -1;
           if (pressedKeysRef.current.has('ArrowRight')) newState.dx = 1;
           if (pressedKeysRef.current.has('ArrowUp')) newState.dy = 1;
           if (pressedKeysRef.current.has('ArrowDown')) newState.dy = -1;
           changed = true; 
       }
       if (changed) {
           // Update the ref directly
           localInputStateRef.current = newState;
           console.log("KEYUP - Input Ref updated to:", localInputStateRef.current);
           // Optionally update state if UI needs to react
           // setLocalInputStateUI(newState); 
       }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []); // Keep empty dependency array, functional updates handle stale state

  // --- WebSocket and Peer Connection Logic ---
  useEffect(() => {
    const SIGNALING_SERVER_URI = 'ws://localhost:3001';
    console.log(`Local Player ID: ${localPlayerIdRef.current}`);
    socketRef.current = io(SIGNALING_SERVER_URI, { query: { id: localPlayerIdRef.current } });
    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Connected to signaling server');
      setIsConnected(true);
      socket.emit('join', { id: localPlayerIdRef.current }); 
      // Determine host immediately after connecting
      const amIHostInitially = determineHost(); 
      // If host, start the game adapter right away
      if (amIHostInitially && !gameAdapterRef.current) {
        console.log("Host connected, starting game adapter immediately...");
        startGameAdapter();
      }
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from signaling server');
      setIsConnected(false);
      // Reset host state on disconnect
      setIsHost(false);
      setHostId(null);
    });

    socket.on('connect_error', (err) => {
        console.error('Signaling connection error:', err);
        setIsConnected(false);
    });

    // --- Signaling Handlers ---

    // Listen for 'userList' instead of 'room-users'
    socket.on('userList', (users: { id: string }[]) => {
        console.log('Received user list:', users);
        const currentPeers = peersRef.current;
        users.forEach(user => {
            if (user.id !== localPlayerIdRef.current && !currentPeers.has(user.id)) {
                console.log(`Initiating connection to existing user: ${user.id}`);
                createPeer(user.id, true);
            }
        });
        determineHost(); // Re-evaluate host when list is received
    });

    // Listen for 'userJoined' instead of 'user-joined', expect { id }
    socket.on('userJoined', (data: { id: string }) => {
      console.log(`User joined: ${data.id}`);
      // Don't need to create peer here, but re-evaluate host
      determineHost();
    });

    // Listen for 'signal' from server
    socket.on('signal', (data: { signal: SimplePeer.SignalData; from: string }) => {
      const senderID = data.from; 
      // Add Log: Confirm signal reception via WebSocket
      console.log(`<<< Received signal event via WebSocket from: ${senderID}`, data.signal);
      let peerConn = peersRef.current.get(senderID);

      if (!peerConn) {
        // Add Log: Indicate peer creation due to incoming signal
        console.log(`Creating peer for incoming signal from: ${senderID}`);
        peerConn = createPeer(senderID, false); 
      }
      // Add Log: Relaying signal to simple-peer instance
      console.log(`Relaying signal to simple-peer instance for ${senderID}`);
      peerConn?.peer.signal(data.signal);
    });

    // Listen for 'userLeft' instead of 'user-left', expect { id }
    socket.on('userLeft', (data: { id: string }) => {
      const userID = data.id;
      console.log(`User left: ${userID}`);
      const peerConn = peersRef.current.get(userID);
      if (peerConn) {
        console.log(`Destroying peer connection for: ${userID}`);
        peerConn.peer.destroy();
        peersRef.current.delete(userID);
        setPeerCount(peersRef.current.size);
        determineHost(); // Re-evaluate host when someone leaves
      }
    });

    // --- Peer Creation Function (Modify data handler) ---
    const createPeer = (targetID: string, initiator: boolean): PeerConnection => {
        console.log(`Creating peer connection (initiator: ${initiator}) to ${targetID}`);
        const peer = new SimplePeer({
            initiator: initiator,
            trickle: true, 
            // Add STUN server configuration
            config: { 
                iceServers: [ 
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                 ] 
            }
        });

        const peerConn: PeerConnection = {
            peer: peer,
            peerID: targetID,
            connected: false,
            // inputBuffer: undefined // Initialized as undefined by default
        };
        peersRef.current.set(targetID, peerConn);
        setPeerCount(peersRef.current.size);

        peer.on('signal', (signalData) => {
            // Add Log: Confirm signal generation by simple-peer
            console.log(`>>> Generating signal event for ${targetID}, sending via WebSocket...`, signalData);
            socket.emit('signal', {
                signal: signalData,
                to: targetID, 
            });
        });

        peer.on('connect', () => {
            console.log(`CONNECT: Successfully connected to peer: ${targetID}`);
            peerConn.connected = true;
            setPeerCount(peersRef.current.size);
            determineHost(); // Re-evaluate host on new connection
            
            // Start game adapter if it hasn't been started (needed for both host and client for drawing)
            if (!gameAdapterRef.current) {
                 startGameAdapter(); 
            }
            // Host sends initial state? Client requests initial state?
            // Let's have client request it for now.
            if (!isHost && targetID === hostId) {
                console.log("Requesting initial state from host...");
                peer.send(JSON.stringify({ type: 'request-initial-state' }));
            }
        });

        // Modify data handler for state sync
        peer.on('data', (data) => {
            try {
                 const message = JSON.parse(data.toString());
                 if (message.type === 'input' && isHost) { // HOST processes input
                    // Buffer input received from clients
                    peerConn.inputBuffer = { dx: message.payload.dx, dy: message.payload.dy };
                 } else if (message.type === 'state-sync' && !isHost) { // CLIENT processes state sync
                    if (gameAdapterRef.current) {
                        // console.log("Received state sync from host");
                        gameAdapterRef.current.deserialize(message.payload);
                    }
                 } else if (message.type === 'request-initial-state' && isHost) { // HOST sends initial state
                     console.log(`Peer ${peerConn.peerID} requested initial state.`);
                     if (gameAdapterRef.current) {
                        const initialState = gameAdapterRef.current.serialize();
                        peer.send(JSON.stringify({ type: 'state-sync', payload: initialState }));
                     }
                 }
            } catch (e) {
                console.error(`Failed to parse incoming peer data from ${targetID}:`, e);
            }
        });

        peer.on('close', () => {
            console.log(`CLOSE: Peer connection closed: ${targetID}`);
            peersRef.current.delete(targetID);
            setPeerCount(peersRef.current.size);
            determineHost(); // Re-evaluate host
        });

        peer.on('error', (err) => {
            console.error(`ERROR: Peer connection error (${targetID}):`, err);
             peersRef.current.delete(targetID);
            setPeerCount(peersRef.current.size);
            determineHost(); // Re-evaluate host
        });

        return peerConn;
    };

    // --- Game Adapter Initialization ---
    const startGameAdapter = () => {
        // Add Log: Check if function is called and refs are valid
        console.log(`startGameAdapter called. gameContainerRef.current is ${gameContainerRef.current ? 'valid' : 'null'}`);

        if (!gameAdapterRef.current && gameContainerRef.current) {
            console.log("Initializing NetplayAdapter...");

            // Create canvas dynamically or ensure it exists
            if (!canvasRef.current) {
                console.log("Creating canvas element...");
                const canvas = document.createElement('canvas');
                canvas.width = NetplayAdapter.canvasSize.width;
                canvas.height = NetplayAdapter.canvasSize.height;
                gameContainerRef.current.appendChild(canvas);
                canvasRef.current = canvas;
                console.log("Canvas element created and appended.");
            }

            try {
                 // Pass isHost flag to constructor? Modify adapter later if needed.
                 gameAdapterRef.current = new NetplayAdapter(canvasRef.current, [], isHost);
                 console.log(`NetplayAdapter instance created.`);
            } catch (e) { console.error("Error creating NetplayAdapter instance:", e); return; }
          
            console.log("Starting game loop...");
            gameLoop(); // Start the loop only after successful adapter creation
        } else {
             // Add Log: Indicate why initialization didn't proceed
             console.log(`startGameAdapter did not proceed. gameAdapterRef.current: ${gameAdapterRef.current ? 'set' : 'null'}, gameContainerRef.current: ${gameContainerRef.current ? 'valid' : 'null'}`);
        }
    };

    // --- Game Loop (Conditional Logic) ---
    let loopCounter = 0;
    let lastStateSendTime = 0;
    const STATE_SEND_INTERVAL = 100; // ms, e.g., 10 times per second

    const gameLoop = () => {
        if (!gameAdapterRef.current || !canvasRef.current) {
            animationFrameRef.current = requestAnimationFrame(gameLoop);
            return;
        }
        const now = performance.now();
        loopCounter++;

        if (isHost) {
            // --- HOST LOGIC ---
            // 1. Collect Inputs (including local)
            const playerInputs = new Map<ShimPlayer, SimpleInput>();
            peersRef.current.forEach((conn) => {
                if (conn.connected) {
                    const inputData = conn.inputBuffer || { dx: 0, dy: 0 }; 
                    const formattedInput: SimpleInput = { arrowKeys: () => ({ x: inputData.dx, y: inputData.dy }) };
                    playerInputs.set(createShimPlayer(conn.peerID), formattedInput);
                    conn.inputBuffer = undefined; // Clear buffer
                }
            });
            const currentLocalInput = localInputStateRef.current;
            const localFormattedInput: SimpleInput = { arrowKeys: () => ({ x: currentLocalInput.dx, y: currentLocalInput.dy }) };
            playerInputs.set(createShimPlayer(localPlayerIdRef.current), localFormattedInput);

            // 2. Tick the Game Adapter (only host runs simulation)
            try {
                 gameAdapterRef.current.tick(playerInputs as any);
            } catch(e) { console.error("Error during gameAdapter.tick:", e); return; }
           
            // 3. Send state periodically
            if (now - lastStateSendTime > STATE_SEND_INTERVAL) {
                const currentState = gameAdapterRef.current.serialize();
                const messageToSend = JSON.stringify({ type: 'state-sync', payload: currentState });
                // console.log("Host sending state sync");
                peersRef.current.forEach(conn => {
                    if (conn.connected) {
                        try { conn.peer.send(messageToSend); } 
                        catch (e) { console.error(`Host failed to send state to ${conn.peerID}:`, e); }
                    }
                });
                lastStateSendTime = now;
            }

            // 4. Host also sends its own input to itself conceptually (it's in playerInputs)
            // No need to send over network to self.

        } else {
            // --- CLIENT LOGIC ---
            // 1. Send Local Input State ONLY to Host
            const currentLocalInput = localInputStateRef.current;
            const hostPeer = hostId ? peersRef.current.get(hostId) : null;
            if (hostPeer && hostPeer.connected) {
                 const messageToSend = JSON.stringify({ type: 'input', payload: currentLocalInput });
                 try { hostPeer.peer.send(messageToSend); } 
                 catch (e) { console.error(`Client failed to send input to host ${hostId}:`, e); }
            }
            // 2. Client does NOT tick the simulation
        }

        // --- BOTH HOST AND CLIENT --- 
        // Draw the current state (host draws its state, client draws last received state)
        try {
             gameAdapterRef.current.draw(canvasRef.current);
        } catch (e) { console.error("Error during gameAdapter.draw:", e); return; }
        
        animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    // --- Function to Determine Host ---
    const determineHost = () => {
      const connectedPeerIDs = Array.from(peersRef.current.keys());
      const allPlayerIDs = [localPlayerIdRef.current, ...connectedPeerIDs].sort();
      const currentHostId = allPlayerIDs[0] || null; // Lowest ID is host
      
      setHostId(currentHostId);
      const amIHost = currentHostId === localPlayerIdRef.current;
      if (amIHost !== isHost) { // Only update if changed
          console.log(`Host changed. Am I host? ${amIHost}. Host ID: ${currentHostId}`);
          setIsHost(amIHost);
      }
      // Return the result so it can be used immediately after calling
      return amIHost; 
    };

    // Cleanup function
    return () => {
      console.log('Cleaning up App component...');
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // Destroy all peer connections
      peersRef.current.forEach(conn => conn.peer.destroy());
      peersRef.current.clear();
      // Disconnect WebSocket
      socket.disconnect();
      socketRef.current = null;
      gameAdapterRef.current = null; // Clear adapter ref
       canvasRef.current?.remove(); // Remove canvas if created dynamically
       canvasRef.current = null;
    };
  }, []); // Ensure dependencies are empty to run only on mount/unmount

  return (
    <div className="App">
      <h1>P2P Snake Game (State Sync)</h1>
      <div>Status: {isConnected ? `Connected (${peerCount} peers) ${isHost ? '(HOST)' : '(Client)'}` : 'Disconnected'}</div>
      {/* Container for the game canvas */}
      <div ref={gameContainerRef} id="game-container" style={{ marginTop: '20px', position: 'relative', width: NetplayAdapter.canvasSize.width, height: NetplayAdapter.canvasSize.height, border: '1px solid grey' }}>
         {/* Canvas will be appended here by startGameAdapter */} 
      </div>
    </div>
  );
};

export default App; 