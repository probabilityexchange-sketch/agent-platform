const INTEGRATION_QUESTION_PATTERNS = [
  /\bwhat\b.*\bintegration(s)?\b/i,
  /\bwhich\b.*\bintegration(s)?\b/i,
  /\b(list|show|tell me)\b.*\bintegration(s)?\b/i,
  /\bconnected\s+integration(s)?\b/i,
  /\bactive\s+integration(s)?\b/i,
  /\bcomposio\b.*\bintegration(s)?\b/i,
  /\bintegration(s)?\b.*\bcomposio\b/i,
];

export function isConnectedIntegrationsQuestion(message: string): boolean {
  const normalized = message.trim();
  if (!normalized) return false;
  return INTEGRATION_QUESTION_PATTERNS.some(pattern => pattern.test(normalized));
}

export function formatConnectedIntegrationsAnswer(connectedIntegrations: string): string {
  const normalized = connectedIntegrations.trim();
  if (!normalized) {
    return 'I do not have any active Composio integrations connected right now.';
  }

  return `The active Composio integrations connected to this account right now are: ${normalized}.`;
}
