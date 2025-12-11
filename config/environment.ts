/**
 * Environment Configuration
 * Contains API URLs and other environment-specific settings
 */

export const ENVIRONMENT = {
    // Production
    production: {
        API_BASE_URL: "https://amber.thatusualguy.ru/api",
        WS_BASE_URL: "wss://amber.thatusualguy.ru/api",
    },
    // Development (local)
    development: {
        API_BASE_URL: "http://localhost:8080/api",
        WS_BASE_URL: "ws://localhost:8080/api",
    },
};

// Get current environment
// Force production for now - change to "development" to use localhost
const ENV = "production"; // __DEV__ ? "development" : "production";

export const API_BASE_URL = ENVIRONMENT[ENV as keyof typeof ENVIRONMENT].API_BASE_URL;
export const WS_BASE_URL = ENVIRONMENT[ENV as keyof typeof ENVIRONMENT].WS_BASE_URL;

