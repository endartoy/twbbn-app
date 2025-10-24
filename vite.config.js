import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		host: '0.0.0.0',  // listen on all network interfaces
		port: 5173,       // default port, change if you want
		strictPort: true, // fail if port is busy
	}
});
