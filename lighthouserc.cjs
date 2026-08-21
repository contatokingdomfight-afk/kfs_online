/** @type {import('lighthouse').Config} */
module.exports = {
  ci: {
    collect: {
      url: [
        process.env.LHCI_URL_MOBILE ?? "https://kingdomfight.com/dashboard",
        process.env.LHCI_URL_HOME ?? "https://kingdomfight.com/",
      ],
      numberOfRuns: 1,
      settings: {
        preset: "desktop",
        emulatedFormFactor: "mobile",
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4,
        },
        screenEmulation: {
          mobile: true,
          width: 390,
          height: 844,
          deviceScaleFactor: 3,
        },
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["warn", { minScore: 0.5 }],
        "categories:accessibility": ["warn", { minScore: 0.85 }],
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
