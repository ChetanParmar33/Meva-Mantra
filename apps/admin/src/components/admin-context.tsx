'use client';
import { createContext, useContext } from 'react';

export type Admin = { id: string; email: string; name: string; role: string };
export const AdminCtx = createContext<Admin | null>(null);
export const useAdmin = () => useContext(AdminCtx);
