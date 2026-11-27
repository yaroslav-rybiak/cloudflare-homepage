const CYRILLIC = /[Ѐ-ӿ]/;

// Visible order on the page; also expected (as a set) in the structured data.
const PROFILES = [
  { name: "LinkedIn", href: "https://www.linkedin.com/in/yrybiak/" },
  { name: "GitHub", href: "https://github.com/yaroslav-rybiak" },
  { name: "Instagram", href: "https://www.instagram.com/yaroslav.rybiak/" },
  { name: "Facebook", href: "https://www.facebook.com/yaroslav.rybiak" },
  { name: "Telegram", href: "https://t.me/yaroslav_rybiak" },
];

const meta = (selector) => cy.get(`head ${selector}`).invoke("attr", "content");

describe("Homepage", () => {
  beforeEach(() => {
    cy.visit("/", {
      onBeforeLoad(win) {
        cy.spy(win.console, "error").as("consoleError");
      },
    });
  });

  it("shows the name and tagline", () => {
    cy.title().should("eq", "Yaroslav Rybiak");
    cy.get("h1").should("have.text", "Yaroslav Rybiak");
    cy.get(".tagline").should("have.text", "QA automation engineer · Calgary");
  });

  it("lists the profile links in order, opening safely in a new tab", () => {
    cy.get("main a.pages-link").should("have.length", PROFILES.length).each(($a, i) => {
      const { name, href } = PROFILES[i];
      expect($a.attr("href"), name).to.eq(href);
      expect($a.attr("target"), `${name} target`).to.eq("_blank");
      expect($a.attr("rel").split(" "), `${name} rel`).to.include.members(["me", "noopener", "noreferrer"]);
      expect($a.attr("aria-label"), `${name} label`).to.contain(name).and.to.contain("new tab");
      const svg = $a.find("svg");
      expect(svg.attr("aria-hidden"), `${name} icon hidden from screen readers`).to.eq("true");
    });
  });

  it("has search and link-preview metadata", () => {
    const description = "Yaroslav Rybiak, QA automation engineer in Calgary.";
    meta('meta[name="description"]').should("eq", description);
    meta('meta[property="og:description"]').should("eq", description);
    meta('meta[property="og:title"]').should("eq", "Yaroslav Rybiak");
    meta('meta[property="og:site_name"]').should("eq", "rybiak.com");
    meta('meta[property="og:url"]').should("eq", "https://rybiak.com/");
    meta('meta[property="og:image"]').should("eq", "https://rybiak.com/og-image.png");
    meta('meta[name="twitter:card"]').should("eq", "summary_large_image");
    cy.get('head link[rel="canonical"]').should("have.attr", "href", "https://rybiak.com/");
  });

  it("has valid ProfilePage structured data that matches the visible links", () => {
    cy.get('script[type="application/ld+json"]').then(($s) => {
      const data = JSON.parse($s.text());
      expect(data["@type"]).to.eq("ProfilePage");
      const person = data.mainEntity;
      expect(person["@type"]).to.eq("Person");
      expect(person.name).to.eq("Yaroslav Rybiak");
      expect(person.jobTitle).to.eq("QA automation engineer");
      expect(person.address.addressLocality).to.eq("Calgary");
      expect(person.sameAs).to.have.members(PROFILES.map((p) => p.href));
      cy.get("main a.pages-link").then(($links) => {
        const visible = [...$links].map((a) => a.getAttribute("href"));
        expect(person.sameAs, "structured data vs links on the page").to.have.members(visible);
      });
    });
  });

  it("serves every icon and image the page refers to", () => {
    const assets = [
      ["/favicon.ico", "image/vnd.microsoft.icon"],
      ["/favicon.svg", "image/svg+xml"],
      ["/apple-touch-icon.png", "image/png"],
      ["/og-image.png", "image/png"],
      ["/cover.css", "text/css"],
    ];
    cy.get('head link[rel~="icon"], head link[rel="apple-touch-icon"], head link[rel="stylesheet"]').each(($l) => {
      expect(assets.map(([p]) => p), "referenced file is in the checked list").to.include($l.attr("href"));
    });
    assets.forEach(([url, type]) => {
      cy.request(url).then((res) => {
        expect(res.status, url).to.eq(200);
        expect(res.headers["content-type"], url).to.contain(type);
      });
    });
  });

  it("only loads files from its own site, as the security policy requires", () => {
    cy.request("/").its("headers").its("content-security-policy").should("contain", "default-src 'none'");
    cy.get("link[href], script[src], img[src]").each(($el) => {
      const url = $el.attr("href") || $el.attr("src");
      if ($el.is('link[rel="canonical"]')) return; // canonical is a pointer, not a loaded file
      expect(url, "same-site resource").to.match(/^\/[^/]/);
    });
    // Cypress disables the CSP and injects its own script while testing, so check the HTML
    // exactly as served for anything the CSP would block on the live site.
    cy.request("/").its("body").then((html) => {
      const doc = new DOMParser().parseFromString(html, "text/html");
      expect(doc.querySelectorAll("style"), "inline <style> blocks").to.have.length(0);
      expect(doc.querySelectorAll("[style]"), "style attributes").to.have.length(0);
      expect(doc.querySelectorAll('script:not([type="application/ld+json"])'), "scripts").to.have.length(0);
    });
  });

  it("has no Cyrillic anywhere a visitor can see it", () => {
    cy.document().then((doc) => {
      expect(doc.body.innerText, "visible text").not.to.match(CYRILLIC);
      expect(doc.title, "title").not.to.match(CYRILLIC);
      doc.querySelectorAll("meta[content], [alt], [aria-label], [title]").forEach((el) => {
        ["content", "alt", "aria-label", "title"].forEach((attr) => {
          const value = el.getAttribute(attr);
          if (value) expect(value, `${el.tagName.toLowerCase()} ${attr}`).not.to.match(CYRILLIC);
        });
      });
    });
  });

  it("passes an accessibility scan", () => {
    cy.checkA11y();
  });

  it("logs no console errors", () => {
    cy.get("@consoleError").should("not.have.been.called");
  });

  [320, 375, 390, 430, 1280].forEach((width) => {
    it(`keeps all icons on one line without sideways scrolling at ${width}px`, () => {
      cy.viewport(width, 800);
      cy.get("main a.pages-link").then(($links) => {
        const tops = [...$links].map((a) => Math.round(a.getBoundingClientRect().top));
        expect(new Set(tops).size, `icon rows (tops: ${tops.join(", ")})`).to.eq(1);
      });
      cy.get(".tagline").then(($t) => {
        const lineHeight = parseFloat(getComputedStyle($t[0]).lineHeight);
        expect($t[0].getBoundingClientRect().height, "tagline on one line").to.be.lessThan(lineHeight * 1.5);
      });
      cy.document().then((doc) => {
        expect(doc.documentElement.scrollWidth, "no horizontal scroll").to.be.at.most(width);
      });
    });
  });
});
