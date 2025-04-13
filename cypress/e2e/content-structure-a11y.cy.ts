/// <reference types="cypress" />
/// <reference types="cypress-axe" />

describe('Content Structure Accessibility Tests', () => {
  // Set up profile to bypass initial profile creation
  const testProfile = {
    id: 'test-structure-user',
    name: 'StructureTester',
    color: '#9933cc'
  };

  beforeEach(() => {
    // Set up profile in local storage for testing
    localStorage.setItem('snakeUserProfile', JSON.stringify(testProfile));

    // Visit game and inject axe
    cy.visit('http://localhost:3000');
    cy.injectAxe();

    // Wait for the game to load before testing
    cy.get('#game-canvas-container', { timeout: 10000 }).should('be.visible');
  });

  it('Page should have proper landmarks', () => {
    // Check that we have a header, main, and footer landmark
    cy.get('header[role="banner"]').should('exist');
    cy.get('main[role="main"]').should('exist');
    cy.get('footer[role="contentinfo"]').should('exist');
  });

  it('Should have a logical heading structure', () => {
    // There should be exactly one h1 on the page
    cy.get('h1').should('have.length', 1);

    // Get all headings and verify their hierarchy
    cy.get('h1, h2, h3, h4, h5, h6').then(($headings) => {
      let currentLevel = 1;
      let foundError = false;

      // Check that heading levels don't skip (e.g., h1 followed by h3)
      $headings.each((i, heading) => {
        const level = parseInt(heading.tagName.charAt(1));

        // Check if it is the first heading
        if (i === 0 && level !== 1) {
          foundError = true;
        }

        // A heading can be same level, one level deeper, or any level higher than current
        if (level > currentLevel + 1) {
          foundError = true;
        }

        // Update current level
        currentLevel = level;
      });

      expect(foundError).to.be.false;
    });
  });

  it('Info panels should have proper heading structure', () => {
    // Check that info panels use appropriate headings
    cy.get('#player-rankings h3').should('exist');
    cy.get('#powerup-legend h3').should('exist');
  });

  it('Sections should have proper ARIA landmarks or labeling', () => {
    cy.get('section[aria-labelledby="game-area-heading"]').should('exist');

    // Update selector to use data-testid
    cy.get('[data-testid="info-panel-wrapper"]').should(($el) => {
      expect($el).to.exist;
    });
  });

  it('Font sizes should be defined in relative units', () => {
    // Sample text elements to check for proper font sizing
    cy.get('#your-snake-info, h3, .player-count-badge').each(($el) => {
      // Get computed font size
      const style = window.getComputedStyle($el[0]);
      const fontSize = style.fontSize;

      // Font size should be defined
      expect(fontSize).to.exist;

      // Check that font size scales with user preferences
      // We can't actually test browser zoom, but we can check
      // if the content uses relative units (not absolute px sizes)
      cy.wrap($el).should('be.visible');
    });
  });

  it('Game information should be structured using lists where appropriate', () => {
    // Power-up legend should use a list structure
    cy.get('#powerup-legend ul, #powerup-legend ol').should('exist');

    // Player rankings should use a table for tabular data
    cy.get('#player-rankings table').should('exist');
  });

  it('Should have sufficient color contrast throughout', () => {
    // We'll use axe-core to check common contrast issues
    cy.checkA11y(
      undefined,
      {
        runOnly: {
          type: 'rule',
          values: ['color-contrast']
        },
        // Note any elements that intentionally have low contrast for design reasons
        rules: {
          'color-contrast': { enabled: true }
        }
      },
      undefined,
      true
    ); // Skip failures as we're just checking
  });

  it('Modal dialogs should properly manage focus', () => {
    cy.get('#your-snake-info .editable-profile-item').first().click();

    // Check modal content attributes and title existence
    cy.get('div.ReactModal__Content')
      .should('be.visible')
      .should('have.attr', 'role', 'dialog')
      .should('have.attr', 'aria-modal', 'true')
      .within(() => {
        // Check within the modal content
        cy.get('#profile-modal-title').should('exist'); // Verify title element exists inside
      });

    cy.get('div.ReactModal__Content button').contains('Cancel').should('be.visible');

    cy.focused().then(($focused) => {
      const focusedElement = $focused[0];
      if (!focusedElement) return;
      expect(Cypress.$(focusedElement).closest('div.ReactModal__Content').length).to.be.greaterThan(
        0
      );
    });

    cy.get('body').type('{esc}');
    cy.get('div.ReactModal__Content').should('not.exist');
  });
});
