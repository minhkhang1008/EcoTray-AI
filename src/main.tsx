import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import Login from './Login';
import { currentAccount, logout, type Account } from './auth';
import './styles.css';
import './final-round.css';
import './product.css';
import './botanical.css';
import './responsive.css';
import {FinalRoundProvider} from './FinalRoundContext';

function Root() {
  const [account, setAccount] = useState<Account | null>(currentAccount);
  if (!account) return <Login onLogin={setAccount} />;
  return (
    <FinalRoundProvider>
      <App
        key={account.email}
        account={account}
        onLogout={() => {
          logout();
          setAccount(null);
        }}
      />
    </FinalRoundProvider>
  );
}

createRoot(document.getElementById('root')!).render(<Root />);
