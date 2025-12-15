export default function robots() {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: '/private/',
        },
        sitemap: 'https://grapedit-jbn06kxje-sany655s-projects.vercel.app/sitemap.xml',
    };
}
