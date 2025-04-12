/// <reference types="cypress" />

describe('Footer Component E2E Tests', () => {
  const currentYear = new Date().getFullYear();
  // Use the actual repo URL from Footer.tsx
  const githubRepoUrl = 'https://github.com/anabelle/p2p-snake';
  const twitterUrl = 'https://x.com/heyanabelle';

  beforeEach(() => {
    // Visit the page before each test
    cy.visit('http://localhost:3000/');
    // Optional: Wait for the footer to be present if needed
    cy.get('footer[role="contentinfo"]').should('be.visible');
  });

  it('should display the footer', () => {
    cy.get('footer[role="contentinfo"]').should('exist');
  });

  it('should display the current year', () => {
    cy.get('footer[role="contentinfo"]').should('contain', currentYear.toString());
  });

  it('should display the copyleft symbol visually (though not inverted in DOM)', () => {
    cy.get('[data-testid="copyleft-symbol"]').should('contain', '©');
    // Check for the class name using attribute contains selector
    cy.get('[data-testid="copyleft-symbol"]')
      .should('have.attr', 'class')
      .and('contain', 'copyleft');
    // Note: Cypress cannot easily assert the visual `transform: scaleX(-1)` from CSS
  });

  it('should display the "Built with heart on fire by heyanabelle" text', () => {
    // Use data-testid for the container
    cy.get('[data-testid="main-line"]').should('contain.text', 'Built with');
    cy.get('[data-testid="main-line"]').should('contain.text', '❤️‍🔥');
    cy.get('[data-testid="main-line"]').should('contain.text', 'by');
    cy.get('[data-testid="main-line"]').find('a').should('contain', 'heyanabelle');
  });

  it('should link to the correct X.com profile in a new tab', () => {
    cy.get('footer[role="contentinfo"] a[href*="x.com/heyanabelle"]')
      .should('have.attr', 'href', twitterUrl)
      .and('have.attr', 'target', '_blank');
    // Check rel="noopener noreferrer" for security
    cy.get('footer[role="contentinfo"] a[href*="x.com/heyanabelle"]').should(
      'have.attr',
      'rel',
      'noopener noreferrer'
    );
  });

  it('should link to the correct GitHub source code in a new tab', () => {
    cy.get('footer[role="contentinfo"] a[href*="github.com"]')
      .should('have.attr', 'href', githubRepoUrl)
      .and('have.attr', 'target', '_blank')
      // Check for the class name using attribute contains selector
      .and('have.attr', 'class')
      .and('contain', 'sourceLink');
    // Check rel="noopener noreferrer" for security
    cy.get('footer[role="contentinfo"] a[href*="github.com"]').should(
      'have.attr',
      'rel',
      'noopener noreferrer'
    );
  });

  it('should have accessible link text', () => {
    cy.get('footer[role="contentinfo"] a[href*="x.com/heyanabelle"]').should(
      'contain.text',
      'heyanabelle'
    );
    cy.get('footer[role="contentinfo"] a[href*="github.com"]').should(
      'contain.text',
      'source code'
    );
  });
});
