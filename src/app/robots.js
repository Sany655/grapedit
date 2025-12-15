export default function robots() {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: '/private/',
        },
        sitemap: 'https://projects.vercel.app/projects.vercel.app/sitemap.xml',
    };
}
