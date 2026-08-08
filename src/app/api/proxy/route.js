export const runtime = 'edge';

export async function GET(request) {
    const targetUrl = request.nextUrl.searchParams.get("url");
    const referer = request.nextUrl.searchParams.get("referer");

    if (!targetUrl) {
        return new Response("Missing url parameter", { status: 400 });
    }

    try {
        const headers = new Headers({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        });

        if (referer) {
            headers.set("Referer", referer);
        }

        const response = await fetch(targetUrl, {
            headers,
            redirect: 'follow',
        });

        if (!response.ok) {
            return new Response(`Proxy Error: ${response.status} ${response.statusText}`, { status: response.status });
        }

        const data = await response.arrayBuffer();

        const responseHeaders = new Headers(response.headers);
        responseHeaders.set("Access-Control-Allow-Origin", "*");
        responseHeaders.set("Access-Control-Allow-Methods", "GET, OPTIONS");
        responseHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

        return new Response(data, {
            status: 200,
            headers: responseHeaders,
        });
    } catch (error) {
        return new Response(`Proxy Exception: ${error.message}`, { status: 500 });
    }
}

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
    });
}
