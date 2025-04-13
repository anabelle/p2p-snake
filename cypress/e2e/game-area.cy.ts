// Tests for game area dimensions and responsiveness

describe('Game Area Dimensions', () => {
  const initialProfile = {
    id: 'test-user-123',
    name: 'TestUser',
    color: '#ff5500'
  };

  beforeEach(() => {
    localStorage.setItem('snakeUserProfile', JSON.stringify(initialProfile));
    cy.visit('http://localhost:3000/');
  });

  it('should use up to 1024px width on larger screens', () => {
    // Set viewport to a large size
    cy.viewport(1280, 800);

    // Wait for game to load
    cy.get('#game-canvas-container').should('be.visible');

    // Check info section width matches canvas width (plus borders)
    cy.get('.info-section').then(($infoSection) => {
      const maxWidth = parseFloat(window.getComputedStyle($infoSection[0]).maxWidth);
      expect(maxWidth).to.be.closeTo(1024, 1);
    });

    // Verify that the info-sections-wrapper also uses the same max-width
    cy.get('.info-sections-wrapper')
      .should('have.css', 'max-width')
      .and((maxWidth) => {
        // Should roughly match 1024px + border width (2px)
        const widthValue = parseFloat(maxWidth.toString().replace('px', ''));
        expect(widthValue).to.be.closeTo(1026, 2);
      });
  });
});
