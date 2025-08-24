module.exports = {
  "testEnvironment": "node",
  "moduleFileExtensions": [
    "ts",
    "js"
  ],
  "transform": {
    "^.+\\\\.ts$": "ts-jest"
  },
  "coverageDirectory": "./coverage",
  "coverageThreshold": {
    "global": {
      "branches": 80,
      "functions": 90,
      "lines": 90,
      "statements": 90
    }
  },
  "preset": "ts-jest"
};