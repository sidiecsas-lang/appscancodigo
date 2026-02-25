import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const LOGO_URL = "https://customer-assets.emergentagent.com/job_manrique-beauty/artifacts/b6wvcecd_LogoPngManrique.png";

export const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function formatCurrency(value) {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(value);
}

export function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('es-EC', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function getToken() {
  return localStorage.getItem('manrique_token');
}

export function setToken(token) {
  localStorage.setItem('manrique_token', token);
}

export function removeToken() {
  localStorage.removeItem('manrique_token');
}

export function getUser() {
  const user = localStorage.getItem('manrique_user');
  return user ? JSON.parse(user) : null;
}

export function setUser(user) {
  localStorage.setItem('manrique_user', JSON.stringify(user));
}

export function removeUser() {
  localStorage.removeItem('manrique_user');
}

export function isAuthenticated() {
  return !!getToken();
}

export function isAdmin() {
  const user = getUser();
  return user?.role === 'admin';
}

export function logout() {
  removeToken();
  removeUser();
  window.location.href = '/login';
}

export function calculatePrice(quantity, isBulk, price1, price2, price3) {
  if (isBulk) return price1;
  if (quantity >= 12) return price2;
  return price3;
}

export function getPriceLabel(quantity, isBulk) {
  if (isBulk) return 'Bulto';
  if (quantity >= 12) return 'Mayor (12+)';
  return 'Unidad (1-11)';
}
