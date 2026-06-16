import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function PostAuthRedirect() {
  const { consumePostAuthRedirect } = useAuth();
  const navigate = useNavigate();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;

    const redirect = consumePostAuthRedirect();
    if (!redirect) return;

    handledRef.current = true;
    navigate(redirect.path, { replace: true, state: redirect.state });
  }, [consumePostAuthRedirect, navigate]);

  return null;
}
