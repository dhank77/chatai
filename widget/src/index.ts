import './widget.css';

interface ChatbotConfig {
  widgetId: string;
  clientId: string;
  apiUrl?: string;
  primaryColor?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  welcomeMessage?: string;
  placeholder?: string;
  title?: string;
}

interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

class ChatbotWidget {
  private config: ChatbotConfig;
  private container!: HTMLElement;
  private bubble!: HTMLElement;
  private window!: HTMLElement;
  private messagesContainer!: HTMLElement;
  private input!: HTMLTextAreaElement;
  private sendButton!: HTMLElement;
  private isOpen: boolean = false;
  private messages: ChatMessage[] = [];
  private sessionId: string;
  private isTyping: boolean = false;

  constructor(config: ChatbotConfig) {
    this.config = {
      apiUrl: 'http://localhost:5173/api',
      primaryColor: '#3B82F6',
      position: 'bottom-right',
      welcomeMessage: 'Hello! How can I help you today?',
      placeholder: 'Type your message...',
      title: 'AI Assistant',
      ...config
    };
    
    this.sessionId = this.generateSessionId();
    this.init();
  }

  private generateSessionId(): string {
    return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  private init(): void {
    this.createWidget();
    this.attachEventListeners();
    this.applyCustomStyles();
  }

  private createWidget(): void {
    // Create main container
    this.container = document.createElement('div');
    this.container.className = `chatbot-widget ${this.config.position}`;
    
    // Create chat bubble
    this.bubble = document.createElement('button');
    this.bubble.className = 'chatbot-bubble';
    this.bubble.innerHTML = `
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
      </svg>
    `;
    
    // Create chat window
    this.window = document.createElement('div');
    this.window.className = 'chatbot-window';
    this.window.innerHTML = `
      <div class="chatbot-header">
        <h3>${this.config.title}</h3>
        <button class="chatbot-close">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
      <div class="chatbot-messages"></div>
      <div class="chatbot-input-container">
        <div class="chatbot-input-wrapper">
          <textarea class="chatbot-input" placeholder="${this.config.placeholder}" rows="1"></textarea>
          <button class="chatbot-send">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      </div>
    `;
    
    // Get references to elements
    this.messagesContainer = this.window.querySelector('.chatbot-messages') as HTMLElement;
    this.input = this.window.querySelector('.chatbot-input') as HTMLTextAreaElement;
    this.sendButton = this.window.querySelector('.chatbot-send') as HTMLElement;
    
    // Append to container
    this.container.appendChild(this.bubble);
    this.container.appendChild(this.window);
    
    // Append to body
    document.body.appendChild(this.container);
    
    // Show welcome message
    this.showWelcomeMessage();
  }

  private attachEventListeners(): void {
    // Bubble click
    this.bubble.addEventListener('click', () => {
      this.toggleWindow();
    });
    
    // Close button
    const closeButton = this.window.querySelector('.chatbot-close') as HTMLElement;
    closeButton.addEventListener('click', () => {
      this.closeWindow();
    });
    
    // Send button
    this.sendButton.addEventListener('click', () => {
      this.sendMessage();
    });
    
    // Input events
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    
    this.input.addEventListener('input', () => {
      this.autoResizeInput();
    });
    
    // Click outside to close
    document.addEventListener('click', (e) => {
      if (this.isOpen && !this.container.contains(e.target as Node)) {
        this.closeWindow();
      }
    });
  }

  private applyCustomStyles(): void {
    if (this.config.primaryColor) {
      const style = document.createElement('style');
      style.textContent = `
        .chatbot-bubble {
          background: ${this.config.primaryColor} !important;
        }
        .chatbot-header {
          background: ${this.config.primaryColor} !important;
        }
        .chatbot-message.user .chatbot-message-content {
          background: ${this.config.primaryColor} !important;
        }
        .chatbot-send {
          background: ${this.config.primaryColor} !important;
        }
        .chatbot-send:hover {
          background: ${this.adjustColor(this.config.primaryColor, -20)} !important;
        }
      `;
      document.head.appendChild(style);
    }
  }

  private adjustColor(color: string, amount: number): string {
    const usePound = color[0] === '#';
    const col = usePound ? color.slice(1) : color;
    const num = parseInt(col, 16);
    let r = (num >> 16) + amount;
    let g = (num >> 8 & 0x00FF) + amount;
    let b = (num & 0x0000FF) + amount;
    r = r > 255 ? 255 : r < 0 ? 0 : r;
    g = g > 255 ? 255 : g < 0 ? 0 : g;
    b = b > 255 ? 255 : b < 0 ? 0 : b;
    return (usePound ? '#' : '') + (r << 16 | g << 8 | b).toString(16).padStart(6, '0');
  }

  private toggleWindow(): void {
    if (this.isOpen) {
      this.closeWindow();
    } else {
      this.openWindow();
    }
  }

  private openWindow(): void {
    this.isOpen = true;
    this.window.classList.add('open');
    this.bubble.classList.add('open');
    this.input.focus();
    this.scrollToBottom();
  }

  private closeWindow(): void {
    this.isOpen = false;
    this.window.classList.remove('open');
    this.bubble.classList.remove('open');
  }

  private showWelcomeMessage(): void {
    if (this.config.welcomeMessage) {
      const welcomeDiv = document.createElement('div');
      welcomeDiv.className = 'chatbot-welcome';
      welcomeDiv.innerHTML = `
        <h4>Welcome!</h4>
        <p>${this.config.welcomeMessage}</p>
      `;
      this.messagesContainer.appendChild(welcomeDiv);
    }
  }

  private async sendMessage(): Promise<void> {
    const message = this.input.value.trim();
    if (!message || this.isTyping) return;

    // Add user message
    this.addMessage({
      id: this.generateMessageId(),
      content: message,
      role: 'user',
      timestamp: new Date()
    });

    // Clear input
    this.input.value = '';
    this.autoResizeInput();

    // Show typing indicator
    this.showTypingIndicator();

    try {
      await this.callStreamChatAPI(message);
    } catch (error) {
      console.error('Chat API error:', error);
      this.hideTypingIndicator();
      this.showError('Sorry, I encountered an error. Please try again.');
    }
  }

  private async callStreamChatAPI(message: string): Promise<void> {
    const response = await fetch(`${this.config.apiUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        sessionId: this.sessionId,
        widgetId: this.config.widgetId,
        clientId: this.config.clientId,
        stream: true
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Hide typing indicator and create message element for streaming
    this.hideTypingIndicator();
    
    const messageId = this.generateMessageId();
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chatbot-message assistant chatbot-fade-in';
    messageDiv.innerHTML = `
      <div class="chatbot-message-content">
        <span class="streaming-content"></span>
      </div>
    `;
    
    this.messagesContainer.appendChild(messageDiv);
    this.scrollToBottom();
    
    const contentSpan = messageDiv.querySelector('.streaming-content') as HTMLElement;
    let fullContent = '';
    
    // Read the stream
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    
    if (reader) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          
          // Check if this chunk contains session ID
          if (chunk.startsWith('SESSION_ID:')) {
            const sessionIdMatch = chunk.match(/SESSION_ID:([^\n]+)/);
            if (sessionIdMatch) {
              this.sessionId = sessionIdMatch[1];
              console.log('Received sessionId:', this.sessionId);
              // Skip this chunk from being displayed
              continue;
            }
          }
          
          fullContent += chunk;
          contentSpan.innerHTML = this.formatMessage(fullContent);
          this.scrollToBottom();
        }
        
        // Add to messages array when complete
        this.messages.push({
          id: messageId,
          content: fullContent,
          role: 'assistant',
          timestamp: new Date()
        });
        
      } catch (error) {
        console.error('Stream reading error:', error);
        this.showError('Error reading response stream.');
      }
    }
  }

  private async callChatAPI(message: string): Promise<{ response?: string; message?: string; success?: boolean; error?: string }> {
    const response = await fetch(`${this.config.apiUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        sessionId: this.sessionId,
        widgetId: this.config.widgetId,
        clientId: this.config.clientId,
        stream: false
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  }

  private addMessage(message: ChatMessage): void {
    this.messages.push(message);
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chatbot-message ${message.role} chatbot-fade-in`;
    messageDiv.innerHTML = `
      <div class="chatbot-message-content">
        ${this.formatMessage(message.content)}
      </div>
    `;
    
    this.messagesContainer.appendChild(messageDiv);
    this.scrollToBottom();
  }

  private formatMessage(content: string): string {
    // Basic markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  private showTypingIndicator(): void {
    this.isTyping = true;
    this.sendButton.setAttribute('disabled', 'true');
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chatbot-message bot';
    typingDiv.innerHTML = `
      <div class="chatbot-typing">
        <div class="chatbot-typing-dots">
          <div class="chatbot-typing-dot"></div>
          <div class="chatbot-typing-dot"></div>
          <div class="chatbot-typing-dot"></div>
        </div>
      </div>
    `;
    typingDiv.id = 'typing-indicator';
    
    this.messagesContainer.appendChild(typingDiv);
    this.scrollToBottom();
  }

  private hideTypingIndicator(): void {
    this.isTyping = false;
    this.sendButton.removeAttribute('disabled');
    
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }

  private showError(message: string): void {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'chatbot-error';
    errorDiv.textContent = message;
    this.messagesContainer.appendChild(errorDiv);
    this.scrollToBottom();
  }

  private autoResizeInput(): void {
    this.input.style.height = 'auto';
    this.input.style.height = Math.min(this.input.scrollHeight, 100) + 'px';
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }, 100);
  }

  private generateMessageId(): string {
    return 'msg_' + Math.random().toString(36).substr(2, 9);
  }

  // Public methods
  public destroy(): void {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }

  public open(): void {
    this.openWindow();
  }

  public close(): void {
    this.closeWindow();
  }

  public sendProgrammaticMessage(message: string): void {
    this.addMessage({
      id: this.generateMessageId(),
      content: message,
      role: 'assistant',
      timestamp: new Date()
    });
  }
}

// Auto-initialize if config is available
function initializeChatbot(): void {
  const config = (window as any).chatbotConfig as ChatbotConfig;
  if (config && config.widgetId && config.clientId) {
    new ChatbotWidget(config);
  } else {
    console.warn('Chatbot widget: Missing required configuration (widgetId, clientId)');
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeChatbot);
} else {
  initializeChatbot();
}

// Export for manual initialization
export { ChatbotWidget };
export default ChatbotWidget;

// Make available globally
(window as any).ChatbotWidget = ChatbotWidget;