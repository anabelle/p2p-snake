import { io, Socket } from 'socket.io-client';
import SimplePeer from 'simple-peer';
import { v4 as uuidv4 } from 'uuid';
import { PeerMessage, Peer, GameState } from '../utils/types';

// Define the URL of the signaling server
const SIGNALING_SERVER_URL = process.env.REACT_APP_SIGNALING_SERVER_URL || 'http://localhost:3001';

class P2PService {
  private socket: Socket | null = null;
  private peers: Peer[] = [];
  private playerId: string = '';
  private onMessageCallback: ((message: PeerMessage) => void) | null = null;
  private onPeerConnectedCallback: ((peerId: string) => void) | null = null;
  private onPeerDisconnectedCallback: ((peerId: string) => void) | null = null;

  // Initialize the P2P service
  public init = async (): Promise<string> => {
    this.playerId = uuidv4();
    
    try {
      // Connect to the signaling server
      this.socket = io(SIGNALING_SERVER_URL);
      
      // Set up event listeners for the signaling server
      this.socket.on('connect', this.handleSocketConnect);
      this.socket.on('userList', this.handleUserList);
      this.socket.on('userJoined', this.handleUserJoined);
      this.socket.on('userLeft', this.handleUserLeft);
      this.socket.on('signal', this.handleSignal);
      
      return this.playerId;
    } catch (error) {
      console.error('Failed to connect to signaling server:', error);
      throw error;
    }
  };

  // Clean up connections when the service is no longer needed
  public cleanup = (): void => {
    // Close all peer connections
    this.peers.forEach((peer) => {
      if (peer.connection) {
        peer.connection.destroy();
      }
    });
    
    // Clear the peers array
    this.peers = [];
    
    // Disconnect from the signaling server
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  };

  // Set a callback to handle incoming messages from peers
  public onMessage = (callback: (message: PeerMessage) => void): void => {
    this.onMessageCallback = callback;
  };

  // Set a callback to handle peer connections
  public onPeerConnected = (callback: (peerId: string) => void): void => {
    this.onPeerConnectedCallback = callback;
  };

  // Set a callback to handle peer disconnections
  public onPeerDisconnected = (callback: (peerId: string) => void): void => {
    this.onPeerDisconnectedCallback = callback;
  };

  // Send a message to all connected peers
  public broadcastMessage = (message: Omit<PeerMessage, 'senderId'>): void => {
    const fullMessage: PeerMessage = {
      ...message,
      senderId: this.playerId,
    };
    
    this.peers.forEach((peer) => {
      if (peer.connection && peer.connection.connected) {
        peer.connection.send(JSON.stringify(fullMessage));
      }
    });
  };

  // Send a message to a specific peer
  public sendMessageToPeer = (peerId: string, message: Omit<PeerMessage, 'senderId'>): boolean => {
    const peer = this.peers.find((p) => p.id === peerId);
    
    if (peer && peer.connection && peer.connection.connected) {
      const fullMessage: PeerMessage = {
        ...message,
        senderId: this.playerId,
      };
      
      peer.connection.send(JSON.stringify(fullMessage));
      return true;
    }
    
    return false;
  };

  // Get the list of connected peers
  public getConnectedPeers = (): string[] => {
    return this.peers
      .filter((peer) => peer.connection && peer.connection.connected)
      .map((peer) => peer.id);
  };

  // Get the player's ID
  public getPlayerId = (): string => {
    return this.playerId;
  };

  // Handle socket connection
  private handleSocketConnect = (): void => {
    console.log('Connected to signaling server');
    
    if (this.socket) {
      // Join the game room
      this.socket.emit('join', { id: this.playerId });
    }
  };

  // Handle user list from the signaling server
  private handleUserList = (users: { id: string }[]): void => {
    users.forEach((user) => {
      // Don't connect to self
      if (user.id !== this.playerId) {
        this.connectToPeer(user.id, true);
      }
    });
  };

  // Handle a new user joining
  private handleUserJoined = (user: { id: string }): void => {
    // Don't connect to self
    if (user.id !== this.playerId) {
      this.connectToPeer(user.id, false);
    }
  };

  // Handle a user leaving
  private handleUserLeft = (user: { id: string }): void => {
    const peerIndex = this.peers.findIndex((peer) => peer.id === user.id);
    
    if (peerIndex !== -1) {
      const peer = this.peers[peerIndex];
      
      // Destroy the connection
      if (peer.connection) {
        peer.connection.destroy();
      }
      
      // Remove the peer from the array
      this.peers.splice(peerIndex, 1);
      
      // Call the callback if it exists
      if (this.onPeerDisconnectedCallback) {
        this.onPeerDisconnectedCallback(user.id);
      }
    }
  };

  // Handle WebRTC signaling
  private handleSignal = (data: { from: string; signal: any }): void => {
    const peer = this.peers.find((p) => p.id === data.from);
    
    if (peer && peer.connection) {
      peer.connection.signal(data.signal);
    }
  };

  // Connect to a peer
  private connectToPeer = (peerId: string, initiator: boolean): void => {
    // Check if we're already connected to this peer
    const existingPeer = this.peers.find((peer) => peer.id === peerId);
    
    if (existingPeer) {
      console.warn(`Already connected to peer ${peerId}`);
      return;
    }
    
    // Create a new SimplePeer instance
    const peerConnection = new SimplePeer({
      initiator,
      trickle: true,
    });
    
    // Create a new peer object
    const peer: Peer = {
      id: peerId,
      connection: peerConnection,
    };
    
    // Add the peer to the peers array
    this.peers.push(peer);
    
    // Set up event listeners for the peer connection
    peerConnection.on('signal', (signal) => {
      // Send the signal to the peer via the signaling server
      if (this.socket) {
        this.socket.emit('signal', {
          to: peerId,
          signal,
        });
      }
    });
    
    peerConnection.on('connect', () => {
      console.log(`Connected to peer ${peerId}`);
      
      // Call the callback if it exists
      if (this.onPeerConnectedCallback) {
        this.onPeerConnectedCallback(peerId);
      }
    });
    
    peerConnection.on('data', (data) => {
      try {
        const message: PeerMessage = JSON.parse(data.toString());
        
        // Call the callback if it exists
        if (this.onMessageCallback) {
          this.onMessageCallback(message);
        }
      } catch (error) {
        console.error('Failed to parse peer message:', error);
      }
    });
    
    peerConnection.on('close', () => {
      console.log(`Disconnected from peer ${peerId}`);
      
      // Find and remove the peer from the peers array
      const peerIndex = this.peers.findIndex((p) => p.id === peerId);
      
      if (peerIndex !== -1) {
        this.peers.splice(peerIndex, 1);
      }
      
      // Call the callback if it exists
      if (this.onPeerDisconnectedCallback) {
        this.onPeerDisconnectedCallback(peerId);
      }
    });
    
    peerConnection.on('error', (error) => {
      console.error(`Peer connection error with ${peerId}:`, error);
    });
  };
}

// Export a singleton instance
export const p2pService = new P2PService(); 