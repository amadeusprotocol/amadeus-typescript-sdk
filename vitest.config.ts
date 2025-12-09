import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: ['node_modules/', 'dist/', '**/*.test.ts', '**/*.spec.ts', '**/examples/**']
		},
		include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
		exclude: ['node_modules', 'dist']
	}
})
