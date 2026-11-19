
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

function App() {
  const [connectionStatus, setConnectionStatus] = useState('Checking...');

  useEffect(() => {
    async function testConnection() {
      const { error } = await supabase
        .from('event_state')
        .select('id')
        .limit(1);

      if (error) {
        setConnectionStatus(`Connection error: ${error.message}`);
      } else {
        setConnectionStatus('Supabase connected successfully!');
      }
    }

    testConnection();
  }, []);

  return (
    <div>
      <h1>THE HUNT FOR 18</h1>
      <p>{connectionStatus}</p>
    </div>
  );
}

export default App;
