// Jest setup file for ES6 modules environment

// Mock global objects if needed
global.localStorage = {
  _storage: {},
  setItem(key, value) {
    this._storage[key] = value;
  },
  getItem(key) {
    return this._storage[key] || null;
  },
  removeItem(key) {
    delete this._storage[key];
  },
  clear() {
    this._storage = {};
  }
};

// Mock window object for browser environment
global.window = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  location: {
    href: 'http://localhost',
    search: ''
  }
};

// Mock document object
global.document = {
  createElement: jest.fn(() => ({
    className: '',
    innerHTML: '',
    appendChild: jest.fn(),
    querySelector: jest.fn(),
    addEventListener: jest.fn(),
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      toggle: jest.fn(),
      contains: jest.fn(() => false)
    },
    style: {}
  })),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(() => []),
  body: {
    appendChild: jest.fn(),
    innerHTML: ''
  }
};

// Clear all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});