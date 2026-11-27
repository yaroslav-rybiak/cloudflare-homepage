describe("Unknown addresses", () => {
  it("return status 404, not the homepage", () => {
    cy.request({ url: "/does-not-exist", failOnStatusCode: false }).then((res) => {
      expect(res.status).to.eq(404);
      expect(res.body).to.contain("Page not found");
    });
  });

  it("show a not-found page that search engines skip and that links home", () => {
    cy.visit("/does-not-exist", { failOnStatusCode: false });
    cy.get("h1").should("have.text", "Page not found");
    cy.get('head meta[name="robots"]').should("have.attr", "content", "noindex");
    cy.contains("a", "homepage").should("have.attr", "href", "/");
  });

  it("styles the not-found page even at a nested address", () => {
    cy.visit("/some/nested/path", { failOnStatusCode: false });
    cy.get("body").should("have.css", "background-color", "rgb(33, 37, 41)");
  });

  it("passes an accessibility scan", () => {
    cy.visit("/does-not-exist", { failOnStatusCode: false });
    cy.checkA11y();
  });
});
