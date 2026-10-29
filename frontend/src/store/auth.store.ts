// Auth store simple avec localStorage
export interface AuthUser {
  sub: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'EMPLOYEE';
  tenantId?: string;
}

export const authStore = {
  getUser(): AuthUser | null {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
        tenantId: payload.tenantId,
      };
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
    localStorage.removeItem('subscription');
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('accessToken');
  },

  isSuperAdmin(): boolean {
    const user = this.getUser();
    return user?.role === 'SUPER_ADMIN';
  },

  isAdmin(): boolean {
    const user = this.getUser();
    return user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  },

  setSubscription(sub: any) {
    if (sub) {
      localStorage.setItem('subscription', JSON.stringify(sub));
    } else {
      localStorage.removeItem('subscription');
    }
  },

  getSubscription(): any | null {
    try {
      const s = localStorage.getItem('subscription');
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  },
};

