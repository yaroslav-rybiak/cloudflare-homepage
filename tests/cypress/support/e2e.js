// Runs axe-core (the engine behind cypress-axe, which doesn't support Cypress 16 yet)
// against the current page and fails with a readable list of violations.
Cypress.Commands.add("checkA11y", () => {
  cy.readFile("node_modules/axe-core/axe.min.js").then((source) => {
    cy.window().then((win) => {
      win.eval(source);
      return win.axe.run(win.document, {
        runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"],
      });
    }).then(({ violations }) => {
      const summary = violations
        .map((v) => `${v.id} (${v.impact}): ${v.help} → ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)
        .join("\n");
      expect(violations, `accessibility violations:\n${summary}`).to.have.length(0);
    });
  });
});
