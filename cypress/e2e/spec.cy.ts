/// <reference types="cypress" />

describe('My First Test', () => {
  it('visits the app root url and checks the title', () => {
    cy.visit('http://localhost:3000/');
    cy.title().should('eq', 'P2P Snake Game');
  });

  it('displays profile modal on first visit, allows saving profile', () => {
    cy.clearLocalStorage('snakeUserProfile');

    cy.visit('http://localhost:3000/');

    cy.get('.profile-modal').should('be.visible');

    cy.get('#profile-modal-title').should('contain', 'Create your profile');

    cy.get('#profileName').type('CypressTest');

    cy.get('.profile-modal-actions button').contains('Save').click();

    cy.get('.profile-modal').should('not.exist');

    cy.get('#game-canvas-container').should('be.visible');
  });
});