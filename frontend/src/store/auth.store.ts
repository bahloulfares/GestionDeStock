// Auth store simple avec localStorage
export interface AuthUser {
  sub: string;
  email: string;
  role: 'ADMIN' | 'EMPLOYEE';
  tenantId: string;
}

export const authStore = {
  getUser(): AuthUser | null {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return { sub: payload.sub, email: payload.email, role: payload.role, tenantId: payload.tenantId };
    } catch {
      return null;
    }
  },

  setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  },

  clear() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('accessToken');
  },

  isAdmin(): boolean {
    const user = this.getUser();
    return user?.role === 'ADMIN';
  },
};
