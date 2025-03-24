describe("Journal Entry Flow", () => {
  it("allows creating and viewing a journal entry", () => {
    // Visit the app
    cy.visit("/");

    // Intercept API requests
    cy.intercept("GET", "/api/entries", {
      body: [
        {
          id: "1",
          title: "Existing Entry",
          content: "This is an existing entry",
          created_at: "2023-01-01T12:00:00Z",
          updated_at: "2023-01-01T12:00:00Z",
          tags: ["test"],
        },
      ],
    }).as("getEntries");

    cy.intercept("POST", "/api/entries", (req) => {
      req.reply({
        body: {
          id: "2",
          ...req.body,
          created_at: "2023-01-02T12:00:00Z",
          updated_at: "2023-01-02T12:00:00Z",
        },
      });
    }).as("createEntry");

    // Wait for existing entry to load
    cy.wait("@getEntries");
    cy.contains("Existing Entry").should("be.visible");

    // Click to create a new entry
    cy.contains("New Entry").click();

    // Fill in the form
    cy.get('label:contains("Title")')
      .next("input")
      .type("My Integration Test Entry");
    cy.get('label:contains("Content")')
      .next("textarea")
      .type("This entry was created during an integration test");
    cy.get('label:contains("Tags")').next("input").type("test,integration");

    // Submit the form
    cy.contains("Create Entry").click();

    // Wait for the create request to complete
    cy.wait("@createEntry");

    // New entry should appear in the feed
    cy.contains("My Integration Test Entry").should("be.visible");
    cy.contains("This entry was created during an integration test").should(
      "be.visible",
    );
    cy.contains("test").should("be.visible");
    cy.contains("integration").should("be.visible");
  });
});
