import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const LIFF_ID = import.meta.env.VITE_LIFF_ID || '';

const root = ReactDOM.createRoot(document.getElementById('root'));

// If no LIFF_ID, run in dev mode directly without any LIFF imports
if (!LIFF_ID) {
    console.log('No LIFF_ID configured, running in development mode');
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
} else {
    // Show loading while LIFF initializes
    root.render(
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            color: '#C9A962',
            fontSize: '1.2rem'
        }}>
            Loading...
        </div>
    );

    // Dynamic import of liff only when needed
    import('@line/liff').then(({ default: liff }) => {
        const initLiff = async () => {
            try {
                await liff.init({ liffId: LIFF_ID });
                console.log('LIFF initialized successfully');

                // Make liff globally available for shareToLine and other features
                window.liff = liff;

                if (!liff.isLoggedIn()) {
                    console.log('User not logged in, redirecting to LINE login...');
                    liff.login();
                    return;
                }

                const profile = await liff.getProfile();
                console.log('User profile:', profile.displayName);

                root.render(
                    <React.StrictMode>
                        <App liffProfile={profile} liff={liff} />
                    </React.StrictMode>
                );
            } catch (error) {
                console.error('LIFF init error:', error);
                root.render(
                    <React.StrictMode>
                        <App liffError={error.message} />
                    </React.StrictMode>
                );
            }
        };
        initLiff();
    }).catch(error => {
        console.error('Failed to load LIFF library:', error);
        root.render(
            <React.StrictMode>
                <App liffError={error.message} />
            </React.StrictMode>
        );
    });
}

