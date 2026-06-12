import IntegrationPanel from '../integrations/IntegrationPanel';
import SlackConfigSection from './SlackConfigSection';

export function IntegrationsSection({ clientId }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
      overflow: 'hidden',
    }}>
      <div style={{ padding: 20 }}>
        <IntegrationPanel clientId={clientId} />
        <SlackConfigSection clientId={clientId} />
      </div>
    </div>
  );
}

export default IntegrationsSection;
