/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
//
// Import cypress-axe
import 'cypress-axe';

// No need to declare types here as they're already included in cypress-axe
// and imported with /// <reference types="cypress-axe" /> in test files

// Add custom tab command for keyboard navigation testing
Cypress.Commands.add('tab', { prevSubject: 'optional' }, (subject) => {
  if (subject) {
    cy.wrap(subject).trigger('keydown', { keyCode: 9, key: 'Tab', code: 'Tab' });
  } else {
    cy.focused().trigger('keydown', { keyCode: 9, key: 'Tab', code: 'Tab' });
  }

  // This only simulates the tab keypress but doesn't actually change focus
  // Wait for focus to change
  return cy.wait(100).focused();
});

// Extend Cypress Chainable interface with our custom commands
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to simulate pressing the Tab key
       * @example cy.tab()
       */
      tab(): Chainable<JQuery<HTMLElement>>;
      tab(subject: JQuery<HTMLElement>): Chainable<JQuery<HTMLElement>>;
    }
  }
}
