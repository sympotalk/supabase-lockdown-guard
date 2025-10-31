import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * [74-B.2] Account page redirect
 * Redirects /agency/account to /agency/profile
 */
export default function AgencyAccount() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/agency/profile", { replace: true });
  }, [navigate]);

  return null;
}
