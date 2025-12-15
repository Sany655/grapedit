export default function manifest() {
    return {
        name: 'Grapedit - Advanced Video Editor',
        short_name: 'Grapedit',
        description: 'trim, and edit videos directly in your browser.',
        start_url: '/',
        display: 'standalone',
        background_color: '#020617',
        theme_color: '#0f172a',
        icons: [
            {
                src: '/icon.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/icon.png',
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    };
}
