module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    moduleNameMapper: {
        '^settings/(.*)$': '<rootDir>/settings/$1',
        '^utils/(.*)$': '<rootDir>/utils/$1',
        '^filter/(.*)$': '<rootDir>/filter/$1',
        '^services/(.*)$': '<rootDir>/services/$1',
        '^suggests/(.*)$': '<rootDir>/suggests/$1',
        '^core/(.*)$': '<rootDir>/core/$1',
        '^main$': '<rootDir>/main.ts',
        '^obsidian$': '<rootDir>/__mocks__/obsidian.ts',
    },
};
