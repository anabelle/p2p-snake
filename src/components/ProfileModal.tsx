import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { SketchPicker, ColorResult } from 'react-color';
import { UserProfile } from '../types'; // Correct path relative to src/components
import { PLAYER_COLORS } from '../game/constants'; // For default color suggestion

interface ProfileModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  onSave: (profile: UserProfile) => void;
  initialProfile: UserProfile | null; // Pass current profile for editing, or null for creation
}

// Make sure to bind modal to your appElement (usually root div)
// In your main App.tsx or index.tsx: Modal.setAppElement('#root');
// For simplicity, we'll do it here, but ideally it's done once globally.
// Consider moving this call to App.tsx
if (typeof window !== 'undefined') { // Check if running in browser
  Modal.setAppElement(document.getElementById('root') || document.body); // Fallback to body if #root isn't found
}


const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onRequestClose,
  onSave,
  initialProfile,
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(PLAYER_COLORS[0]); // Default color

  useEffect(() => {
    if (initialProfile) {
      setName(initialProfile.name);
      setColor(initialProfile.color);
    } else {
      // Reset to defaults if creating a new profile or initialProfile is null
      setName('');
      setColor(PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)]); // Random default color for new profile
    }
  }, [initialProfile, isOpen]); // Reset when modal opens or initialProfile changes

  const handleColorChange = (colorResult: ColorResult) => {
    setColor(colorResult.hex);
  };

  const handleSave = () => {
    const finalName = name.trim() || `Player_${initialProfile?.id?.substring(0, 4) || Math.random().toString(16).substring(2, 6)}`; // Provide default name if empty
    const finalProfile: UserProfile = {
      // Use existing ID if editing, otherwise rely on parent to generate ID for new profile
      id: initialProfile?.id || '', // ID should be handled by the parent component (App.tsx)
      name: finalName,
      color: color,
    };
    onSave(finalProfile); // Pass the profile data back to the parent
    // No need to close here, parent handles it via onSave logic + state update
  };

  const handleRequestClose = () => {
      // Maybe add a confirmation dialog if changes were made?
      // For now, just call the passed function.
      onRequestClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={handleRequestClose}
      contentLabel="User Profile"
      className="profile-modal" // Add CSS class for styling
      overlayClassName="profile-modal-overlay" // Add CSS class for styling
      ariaHideApp={process.env.NODE_ENV !== 'test'} // Prevent warning in tests
    >
      <h2>{initialProfile ? 'Edit Profile' : 'Welcome, please create a profile to start playing!'}</h2>
      <div className="profile-modal-content">
        <div className="form-group">
          <label htmlFor="profileName">Name:</label>
          <input
            type="text"
            id="profileName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
          />
        </div>
        <div className="form-group">
          <label>Color:</label>
          <SketchPicker
            color={color}
            onChangeComplete={handleColorChange}
            presetColors={PLAYER_COLORS} // Suggest default nice colors
             // Disable alpha if you only want solid colors
            disableAlpha={true}
            width="90%" // Adjust width as needed
          />
        </div>
      </div>
      <div className="profile-modal-actions">
        <button onClick={handleSave} className="button-primary">Save</button>
        <button onClick={handleRequestClose} className="button-secondary">Cancel</button>
      </div>
    </Modal>
  );
};

export default ProfileModal; 