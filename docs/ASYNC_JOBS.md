# Async Jobs - API Documentation

## Overview

The Rails backend now uses **Sidekiq** for background job processing. Proposal generation and editing operations are asynchronous to improve user experience and prevent timeouts with AI processing.

---

## How It Works

### Traditional (Synchronous) Flow
```
Client → POST /proposals/generate → Wait for AI → Response with proposal
         (blocks for 10-30 seconds)
```

### New (Asynchronous) Flow
```
Client → POST /proposals/generate → 202 Accepted (immediate response)
         ↓
         Job enqueued in Sidekiq
         ↓
Client → GET /proposals/:id → Check status (generating/generated)
         ↓
         Poll every 2-5 seconds until status = generated
```

---

## API Changes

### 1. Generate Proposal (Async)

**Endpoint**: `POST /api/v1/clients/:client_id/proposals/generate`

**Request**:
```json
{
  "material_ids": [1, 2, 3]
}
```

**Response** (202 Accepted):
```json
{
  "id": 123,
  "client_id": 1,
  "title": "Propuesta para Acme Corp",
  "status": "generating",
  "metadata": {
    "material_ids": [1, 2, 3]
  },
  "version_count": 0,
  "created_at": "2026-06-12T10:00:00Z",
  "updated_at": "2026-06-12T10:00:00Z",
  "message": "Proposal generation started. Check status for updates."
}
```

**Frontend Implementation**:
```javascript
// 1. Start generation
const response = await fetch('/api/v1/clients/1/proposals/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ material_ids: [1, 2, 3] })
});

if (response.status === 202) {
  const proposal = await response.json();

  // 2. Poll for status
  const checkStatus = async () => {
    const statusResponse = await fetch(`/api/v1/proposals/${proposal.id}`);
    const updated = await statusResponse.json();

    if (updated.status === 'generated') {
      // Show proposal content
      console.log('Proposal ready:', updated.current_version.content);
      return;
    }

    if (updated.status === 'draft') {
      // Generation failed
      console.error('Generation failed');
      return;
    }

    // Still generating, check again
    setTimeout(checkStatus, 3000); // Poll every 3 seconds
  };

  checkStatus();
}
```

---

### 2. Edit Proposal (Async)

**Endpoint**: `POST /api/v1/proposals/:id/chat`

**Request**:
```json
{
  "message": "Add a pricing section with three tiers"
}
```

**Response** (202 Accepted):
```json
{
  "proposal": {
    "id": 123,
    "status": "generated",
    "version_count": 2,
    "...": "..."
  },
  "message": "Processing your edit request. Check proposal for updates."
}
```

**Frontend Implementation**:
```javascript
// 1. Send edit request
const response = await fetch('/api/v1/proposals/123/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Add a pricing section with three tiers'
  })
});

if (response.status === 202) {
  const currentVersionCount = proposal.version_count;

  // 2. Poll for new version
  const checkNewVersion = async () => {
    const statusResponse = await fetch('/api/v1/proposals/123');
    const updated = await statusResponse.json();

    if (updated.version_count > currentVersionCount) {
      // New version available
      console.log('New version:', updated.current_version.content);
      return;
    }

    // Still processing, check again
    setTimeout(checkNewVersion, 2000); // Poll every 2 seconds
  };

  checkNewVersion();
}
```

---

## Proposal Status Values

| Status | Description |
|--------|-------------|
| `draft` | Proposal created but not generated, or generation failed |
| `generating` | AI is currently generating the proposal |
| `generated` | Proposal successfully generated and ready |

---

## Polling Best Practices

### Recommended Polling Strategy

```javascript
class ProposalPoller {
  constructor(proposalId, options = {}) {
    this.proposalId = proposalId;
    this.interval = options.interval || 3000; // 3 seconds default
    this.maxAttempts = options.maxAttempts || 60; // 3 minutes max
    this.attempts = 0;
    this.timerId = null;
  }

  async start(onUpdate, onComplete, onError) {
    this.timerId = setInterval(async () => {
      try {
        this.attempts++;

        const response = await fetch(`/api/v1/proposals/${this.proposalId}`);
        const proposal = await response.json();

        onUpdate(proposal);

        if (proposal.status === 'generated') {
          this.stop();
          onComplete(proposal);
        } else if (proposal.status === 'draft') {
          this.stop();
          onError(new Error('Generation failed'));
        } else if (this.attempts >= this.maxAttempts) {
          this.stop();
          onError(new Error('Timeout: generation took too long'));
        }
      } catch (error) {
        this.stop();
        onError(error);
      }
    }, this.interval);
  }

  stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }
}

// Usage
const poller = new ProposalPoller(123);

poller.start(
  (proposal) => {
    // Update UI with current status
    console.log('Status:', proposal.status);
  },
  (proposal) => {
    // Show completed proposal
    console.log('Proposal ready!', proposal);
  },
  (error) => {
    // Handle error
    console.error('Error:', error);
  }
);
```

---

## React Hooks Example

### useProposalGeneration Hook

```javascript
import { useState, useEffect, useRef } from 'react';

function useProposalGeneration(proposalId) {
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!proposalId) return;

    const fetchProposal = async () => {
      try {
        const response = await fetch(`/api/v1/proposals/${proposalId}`);
        const data = await response.json();

        setProposal(data);

        if (data.status === 'generated' || data.status === 'draft') {
          setLoading(false);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
        }
      } catch (err) {
        setError(err);
        setLoading(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      }
    };

    // Initial fetch
    fetchProposal();

    // Poll every 3 seconds if still generating
    intervalRef.current = setInterval(fetchProposal, 3000);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [proposalId]);

  return { proposal, loading, error };
}

// Component usage
function ProposalView({ proposalId }) {
  const { proposal, loading, error } = useProposalGeneration(proposalId);

  if (loading) {
    return <div>Generating proposal... <LoadingSpinner /></div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (proposal.status === 'draft') {
    return <div>Generation failed. Please try again.</div>;
  }

  return (
    <div>
      <h1>{proposal.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: markdownToHtml(proposal.current_version.content) }} />
    </div>
  );
}
```

---

## WebSocket Alternative (Future Enhancement)

For real-time updates without polling:

```javascript
// Future implementation with Action Cable
const subscription = consumer.subscriptions.create(
  { channel: "ProposalChannel", id: proposalId },
  {
    received(data) {
      if (data.status === 'generated') {
        updateUI(data.proposal);
      }
    }
  }
);
```

---

## Monitoring Jobs

### Sidekiq Web UI

Visit `http://localhost:3002/sidekiq` (development only) to:
- View queued jobs
- Monitor job progress
- Check for failed jobs
- Retry failed jobs

### Check Job Status Manually

```bash
# Connect to Rails console
rails c

# Check all jobs
Sidekiq::Queue.all.each do |queue|
  puts "#{queue.name}: #{queue.size} jobs"
end

# Check specific proposal's jobs
proposal = Proposal.find(123)
puts "Status: #{proposal.status}"
puts "Versions: #{proposal.versions.count}"
```

---

## Error Handling

Jobs retry automatically with exponential backoff:
- Attempt 1: Immediate
- Attempt 2: After 3 seconds
- Attempt 3: After 15 seconds

After 3 failed attempts, the job is marked as failed and moved to the Dead queue.

**Frontend should handle**:
- Timeout (proposal still "generating" after 3 minutes)
- Generation failure (status changes to "draft")
- Network errors during polling

---

## Migration Checklist for Frontend

- [ ] Update `generateProposal` function to handle 202 Accepted
- [ ] Implement polling mechanism for proposal status
- [ ] Add loading states during generation
- [ ] Add timeout handling (max 3 minutes)
- [ ] Update `chatWithProposal` function to handle 202 Accepted
- [ ] Implement version polling for chat edits
- [ ] Add error handling for failed generations
- [ ] Test with slow network conditions
- [ ] Add progress indicators to UI

---

## Performance Notes

- Average AI generation time: 10-20 seconds
- Average chat edit time: 5-15 seconds
- Recommended polling interval: 2-3 seconds
- Recommended timeout: 180 seconds (3 minutes)

---

**Last Updated**: 2026-06-12
**Rails Version**: 8.0.5
**Sidekiq Version**: 7.0
