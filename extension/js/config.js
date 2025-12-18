const CONFIG = {
    // DEVELOPMENT
    // BASE_URL: "http://localhost:3000",

    // PRODUCTION
    BASE_URL: "https://grapedit.vercel.app",
};

// Start export if module, otherwise global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
