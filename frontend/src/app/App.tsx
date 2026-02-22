import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AccessibilityProvider } from './context/accessibility-context';
import { AuthProvider } from './context/auth-context';
import { SolanaWalletProvider } from './providers/solana-wallet-provider';
import { ChatbotButton } from './components/chatbot-button';

function App() {
  return (
    <SolanaWalletProvider>
      <AuthProvider>
        <AccessibilityProvider>
          <RouterProvider router={router} />
          <ChatbotButton />
        </AccessibilityProvider>
      </AuthProvider>
    </SolanaWalletProvider>
  );
}

export default App;