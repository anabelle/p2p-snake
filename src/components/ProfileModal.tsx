import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { SketchPicker, ColorResult } from 'react-color';
import { UserProfile } from './../types'; // Correct path relative to src/components
import { PLAYER_COLORS } from '../game/constants'; // For default color suggestion

interface ProfileModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  onSave: (profile: UserProfile) => void;
  initialProfile: UserProfile | null; // Pass current profile for editing, or null for creation
}

/*
 * Important: react-modal accessibility
 * For screen readers, the modal needs to know what the root application element is.
 * Call Modal.setAppElement once in your application's entry point (e.g., App.tsx or index.tsx).
 * Example: Modal.setAppElement('#root'); // Or your app's main container ID
 */
// if (typeof window !== 'undefined') { // Check if running in browser
//   Modal.setAppElement(document.getElementById('root') || document.body); // Fallback to body if #root isn't found
// }


const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onRequestClose,
  onSave,
  initialProfile,
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(PLAYER_COLORS[0]); // Default color
  const [isDirty, setIsDirty] = useState(false); // Track if form has changed

  // Store initial state to compare for dirtiness
  const [initialName, setInitialName] = useState('');
  const [initialColor, setInitialColor] = useState('');


  useEffect(() => {
    const initialNameValue = initialProfile?.name || '';
    const initialColorValue = initialProfile?.color || PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)];

    setName(initialNameValue);
    setColor(initialColorValue);
    // Set initial state for dirty check
    setInitialName(initialNameValue);
    setInitialColor(initialColorValue);
    setIsDirty(false); // Reset dirty state when modal opens/profile changes

    // Reset to defaults if creating a new profile or initialProfile is null
    // setName('');
    // setColor(PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)]); // Random default color for new profile
    // }
  }, [initialProfile, isOpen]); // Reset when modal opens or initialProfile changes

  // Update dirty state when name or color changes
  useEffect(() => {
    if (isOpen) { // Only track changes while modal is open
        const nameChanged = name !== initialName;
        const colorChanged = color !== initialColor;
        setIsDirty(nameChanged || colorChanged);
    }
  }, [name, color, initialName, initialColor, isOpen]);


  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };

  const handleColorChange = (colorResult: ColorResult) => {
    setColor(colorResult.hex);
  };

  const handleSave = () => {
    // Trim name and ensure it's not empty before saving
    const trimmedName = name.trim();
    if (!trimmedName) {
        // Optionally, provide user feedback here (e.g., set an error state, alert)
        console.warn("Name cannot be empty.");
        return; // Prevent saving with empty name
    }
    // const finalName = name.trim() || `Player_${initialProfile?.id?.substring(0, 4) || Math.random().toString(16).substring(2, 6)}`; // Provide default name if empty
    const finalProfile: UserProfile = {
      // Use existing ID if editing, otherwise rely on parent to generate ID for new profile
      id: initialProfile?.id || '', // ID should be handled by the parent component (App.tsx)
      name: trimmedName, // Use the validated, trimmed name
      color: color,
    };
    onSave(finalProfile); // Pass the profile data back to the parent
    setIsDirty(false); // Reset dirty state after save
    // No need to close here, parent handles it via onSave logic + state update
  };

  const handleRequestClose = () => {
      // Maybe add a confirmation dialog if changes were made?
      // For now, just call the passed function.
      if (isDirty) {
        if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
            onRequestClose();
        }
        // If user clicks 'Cancel' in the confirm dialog, do nothing (modal stays open)
      } else {
          onRequestClose(); // Close directly if no changes were made
      }
  }

  const isNameValid = name.trim().length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={handleRequestClose}
      contentLabel="User Profile"
      className="profile-modal" // Add CSS class for styling
      overlayClassName="profile-modal-overlay" // Add CSS class for styling
      ariaHideApp={process.env.NODE_ENV !== 'test'} // Prevent warning in tests
    >
      <h2>{initialProfile ? 'Edit Profile' : 'Welcome! Create your profile'}</h2>
      <div className="profile-modal-content">
        <div className="form-group">
          <label htmlFor="profileName">Name:</label>
          <input
            type="text"
            id="profileName"
            value={name}
            onChange={handleNameChange} // Use handler
            // onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            aria-required="true" // Indicate name is required
            aria-invalid={!isNameValid} // Indicate invalid state if name is empty
          />
           {!isNameValid && <p style={{ color: 'red', fontSize: '0.8em', marginTop: '4px' }}>Name is required.</p>}
        </div>
        <div className="form-group">
          <label>Color:</label> {/* No htmlFor needed as SketchPicker is complex */}
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
        {/* Disable save button if name is invalid */}
        <button onClick={handleSave} className="button-primary" disabled={!isNameValid}>Save</button>
        <button onClick={handleRequestClose} className="button-secondary">Cancel</button>
      </div>
    </Modal>
  );
};

export default ProfileModal; 