/// <reference types="cypress" />

describe('App Initialization and Profile', () => {
  beforeEach(() => {
    // Ensure we are visiting the correct URL before each test
    cy.visit('http://localhost:3000/');
  });

  it('should load the page and have the correct title', () => {
    cy.title().should('eq', 'P2P Snake Game');
  });

  context('First Visit (No Profile)', () => {
    beforeEach(() => {
      // Clear local storage before each test in this context
      cy.clearLocalStorage('snakeUserProfile');
      // Reload the page to ensure the cleared state is reflected
      cy.reload();
    });

    it('should handle first visit profile creation', () => {
      // Check if modal is visible
      cy.get('.profile-modal').should('be.visible');

      // Check modal title for creation
      cy.get('#profile-modal-title').should('contain', 'Create your profile');

      // Type a name into the input
      const testName = 'NewUser';
      cy.get('#profileName').type(testName);

      // Click the save button
      cy.get('.profile-modal-actions button').contains('Save').click();

      // Check if the modal is closed
      cy.get('.profile-modal').should('not.exist');

      // Check if the game canvas container is now visible and contains a canvas
      cy.get('#game-canvas-container').should('be.visible').find('canvas').should('exist');

      // Check if the correct name is displayed
      cy.get('#your-snake-info .editable-profile-item').first().should('contain', testName);
    });
  });

  context('Returning Visit (Existing Profile)', () => {
    const initialProfile = {
      id: 'test-user-123',
      name: 'ReturningUser',
      color: '#ff0000',
    };

    beforeEach(() => {
      // Set local storage to simulate a returning user
      localStorage.setItem('snakeUserProfile', JSON.stringify(initialProfile));
      // Reload the page to ensure the profile is loaded
      cy.reload(); 
    });

    it('should load directly into the game and display existing profile', () => {
      // Check that the profile modal is NOT visible
      cy.get('.profile-modal').should('not.exist');

      // Check if the game canvas container is visible and contains a canvas
      cy.get('#game-canvas-container').should('be.visible').find('canvas').should('exist');

      // Check if the correct name is displayed
      cy.get('#your-snake-info .editable-profile-item').first().should('contain', initialProfile.name);
    });

    it('should allow editing the existing profile', () => {
      // Check that the profile modal is NOT visible initially
      cy.get('.profile-modal').should('not.exist');

      // Check the initial name is displayed
      cy.get('#your-snake-info .editable-profile-item').first().should('contain', initialProfile.name);

      // Click the profile name/area to open the modal
      cy.get('#your-snake-info .editable-profile-item').first().click();

      // Check if modal is visible
      cy.get('.profile-modal').should('be.visible');

      // Check modal title for editing
      cy.get('#profile-modal-title').should('contain', 'Edit Profile');

      // Check if the input field contains the initial name
      cy.get('#profileName').should('have.value', initialProfile.name);

      // Type a new name
      const updatedName = 'UpdatedUser';
      cy.get('#profileName').clear().type(updatedName);

      // Click the save button
      cy.get('.profile-modal-actions button').contains('Save').click();

      // Check if the modal is closed
      cy.get('.profile-modal').should('not.exist');

      // Check if the updated name is displayed
      cy.get('#your-snake-info .editable-profile-item').first().should('contain', updatedName);
      
      // Also check canvas is still present
      cy.get('#game-canvas-container').should('be.visible').find('canvas').should('exist');
    });
  });
});