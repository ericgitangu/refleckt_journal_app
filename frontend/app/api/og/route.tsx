import { ImageResponse } from 'next/og';

// Force dynamic rendering to avoid static generation issues
export const dynamic = 'force-dynamic';

// Set Edge runtime for best performance with OG images
export const runtime = 'edge';

// No revalidation needed for dynamic content
export const revalidate = 0;

// Montserrat font
const montserratBold = fetch(
  new URL('https://fonts.googleapis.com/css2?family=Montserrat:wght@700&display=swap')
).then((res) => res.arrayBuffer());

const montserratRegular = fetch(
  new URL('https://fonts.googleapis.com/css2?family=Montserrat:wght@400&display=swap')
).then((res) => res.arrayBuffer());

export async function GET(request: Request) {
  try {
    // Load the fonts
    const [montserratBoldData, montserratRegularData] = await Promise.all([
      montserratBold,
      montserratRegular,
    ]);

    const { searchParams } = new URL(request.url);
    
    // Get query params
    const title = searchParams.get('title') || 'Reflekt Journal';
    const date = searchParams.get('date') || new Date().toLocaleDateString();
    const hasJournal = searchParams.has('title');

    // Get the absolute URL for images
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                    process.env.VERCEL_URL ? 
                    `https://${process.env.VERCEL_URL}` : 
                    'http://localhost:3000';
    
    const logoUrl = `${baseUrl}/android-chrome-512x512.png`;
    
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
            backgroundColor: '#0f172a', // Dark blue
            color: 'white',
            fontFamily: '"Montserrat", sans-serif',
            padding: '40px',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          }}
        >
          {/* Background pattern */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: 'radial-gradient(circle at 25px 25px, rgba(255, 255, 255, 0.1) 2px, transparent 0)',
              backgroundSize: '50px 50px',
              opacity: 0.4,
            }}
          />
          
          {/* Logo at the top */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              position: 'absolute',
              top: '30px',
              left: '40px',
            }}
          >
            <img 
              src={logoUrl} 
              width={60} 
              height={60} 
              style={{
                borderRadius: '12px',
              }}
            />
            <span
              style={{
                marginLeft: '15px',
                fontSize: '24px',
                fontWeight: 'bold',
              }}
            >
              Reflekt Journal
            </span>
          </div>
          
          {/* Main content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid rgba(100, 116, 139, 0.5)',
              borderRadius: '16px',
              padding: '50px',
              width: '85%',
              background: 'rgba(15, 23, 42, 0.7)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
              backdropFilter: 'blur(10px)',
            }}
          >
            {hasJournal && (
              <div
                style={{
                  fontSize: '18px',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  color: '#94a3b8',
                  marginBottom: '10px',
                }}
              >
                Journal Entry
              </div>
            )}
            
            <h1
              style={{
                fontSize: hasJournal ? '52px' : '64px',
                fontWeight: 'bold',
                textAlign: 'center',
                margin: '0 0 20px 0',
                maxWidth: '90%',
              }}
            >
              {title}
            </h1>
            
            {date && (
              <p
                style={{
                  fontSize: '22px',
                  textAlign: 'center',
                  margin: '0 0 30px 0',
                  color: '#94a3b8',
                }}
              >
                {date}
              </p>
            )}
          </div>
          
          {/* Footer */}
          <div
            style={{
              position: 'absolute',
              bottom: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <p
              style={{
                fontSize: '16px',
                color: '#94a3b8',
              }}
            >
              reflektjournal.app
            </p>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: 'Montserrat',
            data: montserratBoldData,
            style: 'normal',
            weight: 700,
          },
          {
            name: 'Montserrat',
            data: montserratRegularData,
            style: 'normal',
            weight: 400,
          },
        ],
      }
    );
  } catch (e) {
    console.error(e);
    return new Response('Failed to generate OG image', { status: 500 });
  }
} 