import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Grapedit - Advanced Video Editor';
export const size = {
    width: 1200,
    height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    background: 'linear-gradient(to bottom right, #020617, #1e293b)',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'sans-serif',
                    color: 'white',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '24px',
                    }}
                >
                    {/* Logo Icon representation */}
                    <div
                        style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '20px',
                            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <svg
                            width="48"
                            height="48"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <circle cx="6" cy="6" r="3" />
                            <path d="M8.12 8.12 12 12" />
                            <path d="M20 4 8.12 15.88" />
                            <circle cx="6" cy="18" r="3" />
                            <path d="M14.8 14.8 20 20" />
                        </svg>
                    </div>
                    <h1 style={{ fontSize: '80px', fontWeight: 'bold' }}>Grapedit</h1>
                </div>
                <p style={{ fontSize: '32px', color: '#94a3b8', marginTop: '20px' }}>
                    Professional Browser-Based Video Editor
                </p>
            </div>
        ),
        {
            ...size,
        }
    );
}
