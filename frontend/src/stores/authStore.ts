import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthState, User } from '@/types';
import api from '@/lib/api';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string, role: string, verificationImage?: File | null) => {
        set({ isLoading: true });
        try {
          const formData = new FormData();
          formData.append('email', email);
          formData.append('password', password);
          formData.append('role', role);
          if (verificationImage) {
            formData.append('file', verificationImage);
          }

          const res = await api.post('/login', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          const { access_token } = res.data;
          
          // Fetch user profile
          const meRes = await api.get('/me', {
            headers: { Authorization: `Bearer ${access_token}` }
          });
          
          const user: User = {
            id: String(meRes.data.id),
            code: meRes.data.code,
            name: meRes.data.name || meRes.data.email.split('@')[0],
            email: meRes.data.email,
            role: meRes.data.role,
            institute_id: meRes.data.institute_id ? String(meRes.data.institute_id) : undefined,
            batch_id: meRes.data.batch_id ? String(meRes.data.batch_id) : undefined,
            batch_code: meRes.data.batch_code,
            batch_year: meRes.data.batch_year,
            course_name: meRes.data.course_name,
            roll_no: meRes.data.roll_no,
            section: meRes.data.section,
          };
          
          set({ user, token: access_token, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('proctora-auth');
        set({ user: null, token: null, isAuthenticated: false });
        window.dispatchEvent(new Event('auth-logout'));
      },

      setUser: (user: User) => set({ user }),
    }),
    {
      name: 'proctora-auth',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);
