import React, { useEffect, useState } from 'react';
import { IS_DEMO } from '@/api/transport';

export default function EnvironmentStatus() {
  const [error, setError] = useState('');
  useEffect(() => {
    const showError = (event) => setError(event.detail || 'The request failed.');
    window.addEventListener('d16-request-error', showError);
    return () => window.removeEventListener('d16-request-error', showError);
  }, []);
  return <>
    {IS_DEMO && <div className="bg-amber-100 text-amber-950 text-center text-xs px-4 py-2">Local preview · Sample content only · Changes are not saved to QA or production</div>}
    {error && <div role="alert" className="fixed bottom-4 left-4 right-4 md:left-auto md:max-w-lg z-[100] rounded-xl border border-red-200 bg-white p-4 shadow-xl text-red-800">
      <p>{error}</p><button type="button" className="mt-2 underline text-sm" onClick={() => setError('')}>Dismiss</button>
    </div>}
  </>;
}
