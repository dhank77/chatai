export interface EmbedWidget {
  id: string;
  primary_color?: string | null;
  position?: string | null;
  welcome_message?: string | null;
}

/** Builds the <script> snippet customers paste into their website. */
export function buildEmbedScript(widget: EmbedWidget, clientId: string, appOrigin: string): string {
  const config = {
    widgetId: widget.id,
    clientId,
    apiUrl: `${appOrigin}/api`,
    primaryColor: widget.primary_color || '#3B82F6',
    position: widget.position || 'bottom-right',
    welcomeMessage: widget.welcome_message || 'Halo! Ada yang bisa saya bantu?',
  };
  // JSON keeps quotes/newlines in text safe; escaping "<" prevents a </script> break-out
  const configJson = JSON.stringify(config, null, 2).replace(/</g, '\\u003c').replace(/\n/g, '\n  ');
  return `<!-- Chatbot Widget Script -->
<script>
  window.chatbotConfig = ${configJson};
</script>
<script src="${appOrigin}/chatbot.js" async></script>`;
}
