import SimplePeer from 'simple-peer';

// Extend the SimplePeer.Instance type to include custom properties
export interface ExtendedPeerInstance extends SimplePeer.Instance {
  _fixStreams?: () => void;
  _readableState?: any;
  stream?: any;
  [key: string]: any; // Allow dynamic property access
}

export interface PeerMessage {
  type:
    | 'state'
    | 'action'
    | 'chat'
    | 'DIRECTION_CHANGE'
    | 'STATE_UPDATE'
    | 'PLAYER_JOIN'
    | 'PLAYER_LEAVE';
  senderId: string;
  data: any;
  timestamp: number;
  sequence: number;
}

export interface Peer {
  id: string;
  connection: ExtendedPeerInstance | null; // Use ExtendedPeerInstance again
}
