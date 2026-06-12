import { APP_NAME } from '../lib/constants';

function LandingPage() {
  return (
    <iframe
      src="/landing.html"
      style={{ width: '100%', height: '100vh', border: 'none' }}
      title={`${APP_NAME} Landing`}
    />
  );
}

export default LandingPage;
