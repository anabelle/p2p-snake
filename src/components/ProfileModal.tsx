import React, { useState, useEffect, useRef } from 'react';
import Modal from 'react-modal';
import { CirclePicker, ColorResult } from 'react-color';
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
  
  // Ref for the modal title to focus on open
  const modalTitleRef = useRef<HTMLHeadingElement>(null);

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

  // Focus the modal title when modal opens
  const handleAfterOpen = () => {
    // Focus the modal title for accessibility
    if (modalTitleRef.current) {
      modalTitleRef.current.focus();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={handleRequestClose}
      onAfterOpen={handleAfterOpen}
      contentLabel="User Profile"
      className="profile-modal" // Add CSS class for styling
      overlayClassName="profile-modal-overlay" // Add CSS class for styling
      ariaHideApp={process.env.NODE_ENV !== 'test'} // Prevent warning in tests
      aria-modal="true"
      role="dialog"
      shouldCloseOnEsc={false}
      shouldCloseOnOverlayClick={false}
      shouldReturnFocusAfterClose={true}
    >
      <h2 id="profile-modal-title" ref={modalTitleRef} tabIndex={-1}>
        {initialProfile ? 'Edit Profile' : 'Welcome! Create your profile'}
      </h2>
      <div className="profile-modal-content" aria-labelledby="profile-modal-title">
        <div className="form-group">
          <label htmlFor="profileName">Name:</label>
          <input
            type="text"
            id="profileName"
            value={name}
            onChange={handleNameChange} // Use handler
            placeholder="Enter your name"
            aria-required="true" // Indicate name is required
            aria-invalid={!isNameValid} // Indicate invalid state if name is empty
            aria-describedby={!isNameValid ? "name-error" : undefined}
          />
          {!isNameValid && <p id="name-error" style={{ color: 'red', fontSize: '0.8em', marginTop: '4px' }} role="alert">Name is required.</p>}
        </div>
        <div className="form-group">
          <label htmlFor="color-picker">Color:</label>
          <div id="color-picker" role="application" aria-label="Color picker">
            <CirclePicker
              color={color}
              onChange={handleColorChange}
              colors={PLAYER_COLORS}
              width="100%"
              circleSize={24}
              circleSpacing={10}
            />
          </div>
        </div>
      </div>
      <div className="profile-modal-actions">
        <button 
          onClick={handleSave} 
          className="button-primary" 
          disabled={!isNameValid}
          aria-disabled={!isNameValid}
        >
          Save
        </button>
      </div>
    </Modal>
  );
};

export default ProfileModal; 