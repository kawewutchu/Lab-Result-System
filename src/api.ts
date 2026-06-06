import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 300000, // 5 min for analysis
});

export const analyzeSymbol = (symbol: string) =>
  api.post('/analyze', { symbol });

export const getPortfolio = () =>
  api.get('/portfolio');

export const addPosition = (data: any) =>
  api.post('/portfolio', data);

export const updatePosition = (id: number, data: any) =>
  api.put(`/portfolio/${id}`, data);

export const getPortfolioSummary = (accountSize?: number) =>
  api.get('/portfolio/summary', { params: { account_size: accountSize } });

export const getJournal = () =>
  api.get('/journal');

export const calculateRisk = (data: any) =>
  api.post('/risk/calculate', data);

export default api;
