import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import Login from './Login';
import ProjectInfo from './ProjectInfo';
import { currentAccount, logout, type Account } from './auth';
import { canonicalizeLocation, navigate, pageTitles, rememberWorkspace, useRoute } from './router';
import './styles.css';
import './final-round.css';
import './product.css';
import './botanical.css';
import './responsive.css';
import './project.css';
import {FinalRoundProvider} from './FinalRoundContext';

canonicalizeLocation();

function Root() {
  const [account, setAccount] = useState<Account | null>(currentAccount);
  const route = useRoute();
  useEffect(() => {
    if (route.page !== 'project') rememberWorkspace(route.path);
    document.title = account
      ? `${pageTitles[route.page]} · EcoTray`
      : 'Đăng nhập · EcoTray';
  }, [route, account]);
  if (!account) return <Login onLogin={setAccount} />;
  const signOut = () => {
    logout();
    setAccount(null);
    navigate('/overview', true);
  };
  return (
    <FinalRoundProvider>
      {route.page === 'project' ? (
        <ProjectInfo account={account} onLogout={signOut} />
      ) : (
        <App key={account.email} account={account} onLogout={signOut} />
      )}
    </FinalRoundProvider>
  );
}

createRoot(document.getElementById('root')!).render(<Root />);
