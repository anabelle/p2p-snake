/// <reference types="cypress" />

describe('App Initialization and Profile', () => {
  beforeEach(() => {
    // Ensure we are visiting the correct URL before each test
    cy.visit('http://localhost:3000/');
  });

  it('should load the page and have the correct title', () => {
    cy.title().should('eq', 'Multiplayer Snake Game');
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
      cy.get('#profileName').type(testName, { delay: 50, force: true });
      cy.get('#profileName').should('have.value', testName);

      // Click the save button
      cy.get('.profile-modal-actions button').contains('Save').click();

      // Check if the modal is closed
      cy.get('.profile-modal').should('not.exist');

      // Check if the game canvas container is now visible and contains a canvas
      // Wait for the canvas to ensure game has likely initialized after profile save
      cy.get('#game-canvas-container canvas', { timeout: 10000 }).should('be.visible');

      // Check if the correct name is displayed, allowing for retry
      cy.get('#your-snake-info .editable-profile-item').first().should('contain', testName);
    });
  });

  context('Returning Visit (Existing Profile)', () => {
    const initialProfile = {
      id: 'test-user-123',
      name: 'ReturningUser',
      color: '#ff0000'
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
      cy.get('#your-snake-info .editable-profile-item')
        .first()
        .should('contain', initialProfile.name);
    });

    it('should display the game canvas with correct dimensions', () => {
      // Calculate expected dimensions based on actual constants
      const expectedWidth = 50 * 12; // GRID_SIZE.width * CELL_SIZE
      const expectedHeight = 30 * 12; // GRID_SIZE.height * CELL_SIZE (Corrected)

      cy.get('#game-canvas-container canvas')
        .should('be.visible')
        .and('have.attr', 'width', expectedWidth.toString())
        .and('have.attr', 'height', expectedHeight.toString()); // Corrected assertion
    });

    it('should display the player rankings section', () => {
      cy.get('#player-rankings').should('be.visible');
      cy.get('#player-rankings h3').should('contain', 'Player Rankings');
      cy.get('#player-rankings table').should('be.visible');
      // Check for table headers
      cy.get('#player-rankings table thead th').should('have.length', 4);
      cy.get('#player-rankings table thead th').eq(0).should('contain', 'Player');
      cy.get('#player-rankings table thead th').eq(1).should('contain', 'Score');
    });

    it('should display the power-up legend section', () => {
      cy.get('#powerup-legend').should('be.visible');
      cy.get('#powerup-legend h3').should('contain', 'Power-Up Legend');
      cy.get('#powerup-legend ul').should('be.visible');
      // Check for at least one list item
      cy.get('#powerup-legend ul li').should('have.length.greaterThan', 0);
      // Check for specific power-up text
      cy.get('#powerup-legend ul li').first().should('contain', 'Speed Boost');
    });

    it('should allow editing the existing profile', () => {
      // Check that the profile modal is NOT visible initially
      cy.get('.profile-modal').should('not.exist');

      // Check the initial name is displayed
      cy.get('#your-snake-info .editable-profile-item')
        .first()
        .should('contain', initialProfile.name);

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
      cy.get('#profileName').clear({ force: true }).type(updatedName, { delay: 50, force: true });
      cy.get('#profileName').should('have.value', updatedName);

      // Click the save button
      cy.get('.profile-modal-actions button').contains('Save').click();

      // Check if the modal is closed
      cy.get('.profile-modal').should('not.exist');

      // Check if the updated name is displayed, allowing for retry
      cy.get('#your-snake-info .editable-profile-item').first().should('contain', updatedName);

      // Also check canvas is still present
      cy.get('#game-canvas-container canvas').should('be.visible');
    });

    it('should handle arrow key presses for input', () => {
      // Focus the container or body to ensure key events are captured
      // cy.get('#game-canvas-container').focus(); // Focusing div might not work, window is usually the target

      // Trigger an arrow key press on the window
      cy.window().trigger('keydown', { key: 'ArrowRight' });

      // Basic assertion: Ensure the app didn't crash and key elements are still present
      cy.get('#game-canvas-container canvas').should('be.visible');
      cy.get('#your-snake-info').should('be.visible');
    });
  });
});
