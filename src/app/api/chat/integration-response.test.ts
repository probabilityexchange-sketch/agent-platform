import { describe, expect, it } from 'vitest';
import {
  formatConnectedIntegrationsAnswer,
  isConnectedIntegrationsQuestion,
} from './integration-response';

describe('integration response helpers', () => {
  it('detects questions asking for connected Composio integrations', () => {
    expect(isConnectedIntegrationsQuestion('What Composio integrations is this connected to?')).toBe(true);
    expect(isConnectedIntegrationsQuestion('Show me the active integrations')).toBe(true);
    expect(isConnectedIntegrationsQuestion('Help me draft a message')).toBe(false);
  });

  it('formats the live integration list without falling back to stale memory', () => {
    expect(formatConnectedIntegrationsAnswer('Gmail, Slack')).toBe(
      'The active Composio integrations connected to this account right now are: Gmail, Slack.'
    );
    expect(formatConnectedIntegrationsAnswer('')).toBe(
      'I do not have any active Composio integrations connected right now.'
    );
  });
});
