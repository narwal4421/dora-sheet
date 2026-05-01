export const authService = {
  async refreshToken(): Promise<{ accessToken: string } | null> {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3002';
      const res = await fetch(`${apiUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // assuming refresh token in httpOnly cookie
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('token', data.data.accessToken);
        return { accessToken: data.data.accessToken };
      }
      return null;
    } catch {
      return null;
    }
  }
};
