
import { NextResponse } from 'next/server';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const referer = searchParams.get('referer'); // Get referer from params

    if (!url) {
        return NextResponse.json({ error: 'Missing URL parameter' }, { status: 400 });
    }

    try {
        const reqHeaders = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        };
        if (referer) {
            reqHeaders["Referer"] = referer;
            reqHeaders["Origin"] = new URL(referer).origin; // Often needed alongside Referer
        }

        const response = await fetch(url, {
            headers: reqHeaders
        });

        if (!response.ok) {
            console.error(`Proxy upstream error for ${url}: ${response.status} ${response.statusText}`);
        }

        // Copy headers
        const resHeaders = new Headers();
        resHeaders.set("Access-Control-Allow-Origin", "*");

        // Forward content type
        const contentType = response.headers.get("content-type");
        if (contentType) {
            resHeaders.set("Content-Type", contentType);
        }

        return new NextResponse(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: resHeaders,
        });

    } catch (error) {
        console.error("Proxy error:", error);
        return NextResponse.json({ error: 'Failed to fetch resource' }, { status: 500 });
    }
}
