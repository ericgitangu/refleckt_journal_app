import { ImageResponse } from 'next/og';

// Force dynamic rendering to avoid static generation issues
export const dynamic = 'force-dynamic';

// Set Edge runtime for best performance with OG images
export const runtime = 'edge';

// Load fonts from Google (no need for local fonts)
const fontMontserratBold = fetch(
  new URL('https://fonts.googleapis.com/css2?family=Montserrat:wght@700&display=swap')
).then((res) => res.arrayBuffer());

const fontMontserratRegular = fetch(
  new URL('https://fonts.googleapis.com/css2?family=Montserrat:wght@400&display=swap')
).then((res) => res.arrayBuffer());

export async function GET(request: Request) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    
    // Get title and date from query params with fallbacks
    const title = searchParams.get('title') || 'Reflekt Journal';
    const date = searchParams.get('date') || new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    
    // Get optional content preview (truncated)
    const content = searchParams.get('content') || 'Capture your thoughts and gain insights with AI-powered journaling';
    
    // Load fonts
    const [montserratBoldData, montserratRegularData] = await Promise.all([
      fontMontserratBold,
      fontMontserratRegular,
    ]);

    // Generate the OG image with branded styling
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f8f9fa',
            backgroundImage: 'linear-gradient(to bottom right, #f8f9fa, #e9ecef)',
            padding: 50,
          }}
        >
          {/* Journal paper background */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              width: '100%',
              height: '100%',
              backgroundColor: 'white',
              borderRadius: 16,
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
              padding: 40,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Paper texture lines */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: 'linear-gradient(transparent 38px, #e5e7eb 38px)',
                backgroundSize: '100% 39px',
                zIndex: 0,
                opacity: 0.3,
              }}
            />
            
            {/* Logo and Title section */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: 20,
                zIndex: 1,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  backgroundColor: '#5046e5',
                  marginRight: 20,
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 3v4a1 1 0 0 0 1 1h4"></path>
                  <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"></path>
                  <path d="M9 9l1 0"></path>
                  <path d="M9 13l6 0"></path>
                  <path d="M9 17l6 0"></path>
                </svg>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 24, color: '#5046e5', fontWeight: 700 }}>
                  Reflekt Journal
                </p>
                <p style={{ margin: 0, fontSize: 16, color: '#6b7280' }}>
                  {date}
                </p>
              </div>
            </div>
            
            {/* Main content */}
            <div style={{ marginBottom: 30, zIndex: 1 }}>
              <h1
                style={{
                  fontSize: 48,
                  fontWeight: 700,
                  marginBottom: 20,
                  color: '#111827',
                  lineHeight: 1.2,
                }}
              >
                {title}
              </h1>
              <p
                style={{
                  fontSize: 24,
                  color: '#4b5563',
                  lineHeight: 1.5,
                }}
              >
                {content.length > 160 ? content.substring(0, 157) + '...' : content}
              </p>
            </div>
            
            {/* Bottom tag */}
            <div style={{ display: 'flex', alignItems: 'center', zIndex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 16px',
                  backgroundColor: '#5046e510',
                  borderRadius: 9999,
                  fontSize: 18,
                  color: '#5046e5',
                  fontWeight: 600,
                }}
              >
                #Reflection
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: 'Montserrat',
            data: montserratRegularData,
            weight: 400,
            style: 'normal',
          },
          {
            name: 'Montserrat',
            data: montserratBoldData,
            weight: 700,
            style: 'normal',
          },
        ],
      }
    );
  } catch (error) {
    console.error('Error generating OG image:', error);
    return new Response('Failed to generate OG image', { status: 500 });
  }
} 