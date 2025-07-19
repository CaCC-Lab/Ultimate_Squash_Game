// Jest setup file for unit tests

// Mock console methods to avoid noise during tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
};

// Mock TextEncoder for Web Crypto API tests
global.TextEncoder = global.TextEncoder || class {
  encode(str) {
    return new Uint8Array(str.split('').map(c => c.charCodeAt(0)));
  }
};

// Mock crypto.subtle for Web Crypto API tests
if (!global.crypto) {
  global.crypto = {};
}
if (!global.crypto.subtle) {
  global.crypto.subtle = {};
}
global.crypto.subtle.importKey = jest.fn();
global.crypto.subtle.sign = jest.fn();

// Mock fetch globally
global.fetch = jest.fn();