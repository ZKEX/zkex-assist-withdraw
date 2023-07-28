/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  transform: {
    '^.+\\.(t|j)s?$': [
      '@swc-node/jest',
    ],
  },
}