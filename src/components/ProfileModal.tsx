import React, { useState, useEffect, useRef } from 'react';
import Modal from 'react-modal';
import { CirclePicker, ColorResult } from 'react-color';
import { UserProfile } from './../types';
import { PLAYER_COLORS } from '../game/constants';

interface ProfileModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  onSave: (profile: UserProfile) => void;
  initialProfile: UserProfile | null;
}

const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onRequestClose,
  onSave,
  initialProfile
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(PLAYER_COLORS[0]); // Default color
  const [isDirty, setIsDirty] = useState(false); // Track if form has changed

  // Ref for the first focusable element
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Store initial state to compare for dirtiness
  const [initialName, setInitialName] = useState('');
  const [initialColor, setInitialColor] = useState('');

  useEffect(() => {
    const initialNameValue = initialProfile?.name || '';
    const initialColorValue =
      initialProfile?.color || PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)];

    setName(initialNameValue);
    setColor(initialColorValue);
    // Set initial state for dirty check
    setInitialName(initialNameValue);
    setInitialColor(initialColorValue);
    setIsDirty(false); // Reset dirty state when modal opens/profile changes
  }, [initialProfile, isOpen]); // Reset when modal opens or initialProfile changes

  // Update dirty state when name or color changes
  useEffect(() => {
    if (isOpen) {
      // Only track changes while modal is open
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
      setIsDirty(true);
      return;
    }

    const finalProfile: UserProfile = {
      id: initialProfile?.id || '', // ID should be handled by the parent component (App.tsx)
      name: trimmedName, // Use the validated, trimmed name
      color: color
    };
    onSave(finalProfile); // Pass the profile data back to the parent
    setIsDirty(false); // Reset dirty state after save
  };

  const handleRequestClose = () => {
    // Maybe add a confirmation dialog if changes were made?
    if (isDirty) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        onRequestClose();
      }
    } else {
      onRequestClose();
    }
  };

  const isNameValid = name.trim().length > 0;

  const handleAfterOpen = () => {
    // Focus the first focusable element (name input) when modal opens
    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={handleRequestClose}
      onAfterOpen={handleAfterOpen}
      contentLabel='User Profile'
      className='profile-modal'
      overlayClassName='profile-modal-overlay'
      ariaHideApp={process.env.NODE_ENV !== 'test'}
      aria-modal='true'
      role='dialog'
      aria-labelledby='profile-modal-title'
      shouldCloseOnEsc={!!initialProfile}
      shouldCloseOnOverlayClick={!!initialProfile}
      shouldReturnFocusAfterClose={true}
    >
      <h2 id='profile-modal-title'>
        {initialProfile ? 'Edit Profile' : 'Welcome! Create your profile'}
      </h2>
      {}
      <div className='profile-modal-content'>
        <div className='form-group'>
          <label htmlFor='profileName'>Name:</label>
          <input
            ref={nameInputRef}
            type='text'
            id='profileName'
            value={name}
            onChange={handleNameChange}
            placeholder='Enter your name'
            aria-required='true'
            aria-invalid={!isNameValid}
            aria-describedby={!isNameValid ? 'name-error' : undefined}
          />
          {!isNameValid && (
            <p
              id='name-error'
              style={{ color: 'red', fontSize: '0.8em', marginTop: '4px' }}
              role='alert'
            >
              Name is required.
            </p>
          )}
        </div>
        <div className='form-group'>
          <label htmlFor='color-picker-container'>Color:</label>
          <div id='color-picker-container' role='application' aria-label='Color picker'>
            <CirclePicker
              color={color}
              onChange={handleColorChange}
              colors={PLAYER_COLORS}
              width='100%'
              circleSize={24}
              circleSpacing={10}
            />
          </div>
        </div>
      </div>
      <div className='profile-modal-actions'>
        {}
        {initialProfile && (
          <button onClick={handleRequestClose} className='button-secondary'>
            Cancel
          </button>
        )}
        <button
          onClick={handleSave}
          className='button-primary'
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
