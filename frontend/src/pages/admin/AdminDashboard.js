import React, { useState, useEffect } from 'react';
import { API_URL, getToken, formatCurrency, LOGO_URL } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Package, Users, FileText, BarChart3, TrendingUp, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import AdminLayout from '../../components/AdminLayout';

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [topScanned, setTopScanned] = useState([]);
  const [topUsersActivity, setTopUsersActivity] = useState([]);
  const [topUsersQuotes, setTopUsersQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      const token = getToken();
      const headers = { Authorization: `Bearer ${token}` };
      
      try {
        const [summaryRes, scannedRes, activityRes, quotesRes] = await Promise.all([
          axios.get(`${API_URL}/metrics/summary`, { headers }),
          axios.get(`${API_URL}/metrics/top-scanned`, { headers }),
          axios.get(`${API_URL}/metrics/top-users-activity`, { headers }),
          axios.get(`${API_URL}/metrics/top-users-quotes`, { headers })
        ]);
        
        setSummary(summaryRes.data);
        setTopScanned(scannedRes.data);
        setTopUsersActivity(activityRes.data);
        setTopUsersQuotes(quotesRes.data);
      } catch (error) {
        console.error('Error fetching metrics:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMetrics();
  }, []);

  const summaryCards = [
    { 
      label: 'Productos', 
      value: summary?.total_products || 0, 
      icon: Package,
      color: 'bg-blue-50 text-blue-600'
    },
    { 
      label: 'Usuarios', 
      value: summary?.total_users || 0, 
      icon: Users,
      color: 'bg-green-50 text-green-600'
    },
    { 
      label: 'Cotizaciones', 
      value: summary?.total_quotes || 0, 
      icon: FileText,
      color: 'bg-purple-50 text-purple-600'
    },
    { 
      label: 'Escaneos', 
      value: summary?.total_scans || 0, 
      icon: BarChart3,
      color: 'bg-[#D4A5A5]/10 text-[#D4A5A5]'
    }
  ];

  return (
    <AdminLayout>
      <div className="p-4 md:p-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-serif text-[#1A1A1A]">Dashboard</h1>
          <p className="text-gray-500 mt-1">Resumen de actividad de la aplicación</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="summary-cards">
          {summaryCards.map((card) => (
            <Card key={card.label} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">{card.label}</p>
                    <p className="text-2xl font-bold text-[#1A1A1A] mt-1" data-testid={`summary-${card.label.toLowerCase()}`}>
                      {loading ? '...' : card.value.toLocaleString()}
                    </p>
                  </div>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.color}`}>
                    <card.icon size={20} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Top Scanned Products Chart */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp size={18} className="text-[#D4A5A5]" />
              Top 10 Productos Más Escaneados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topScanned.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topScanned} layout="vertical" margin={{ left: 10, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" />
                    <YAxis 
                      dataKey="product_code" 
                      type="category" 
                      width={80}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-3 rounded-lg shadow-lg border">
                              <p className="font-medium text-sm">{data.product_name}</p>
                              <p className="text-xs text-gray-500">{data.product_code}</p>
                              <p className="text-sm mt-1">
                                <span className="font-bold text-[#D4A5A5]">{data.scan_count}</span> escaneos
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="scan_count" fill="#D4A5A5" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-gray-400">
                No hay datos de escaneos todavía
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rankings */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Top Users by Activity */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Award size={18} className="text-[#D4A5A5]" />
                Usuarios Más Activos (Escaneos)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topUsersActivity.length > 0 ? (
                <div className="space-y-3">
                  {topUsersActivity.map((user, index) => (
                    <div 
                      key={user.user_id} 
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      data-testid={`user-activity-${index}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 ? 'bg-yellow-100 text-yellow-700' :
                          index === 1 ? 'bg-gray-200 text-gray-700' :
                          index === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="font-medium text-[#1A1A1A]">{user.user_code}</span>
                      </div>
                      <Badge variant="secondary">{user.scan_count} escaneos</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[150px] flex items-center justify-center text-gray-400">
                  No hay datos todavía
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Users by Quotes */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText size={18} className="text-[#D4A5A5]" />
                Usuarios con Más Cotizaciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topUsersQuotes.length > 0 ? (
                <div className="space-y-3">
                  {topUsersQuotes.map((user, index) => (
                    <div 
                      key={user.user_id} 
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      data-testid={`user-quotes-${index}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 ? 'bg-yellow-100 text-yellow-700' :
                          index === 1 ? 'bg-gray-200 text-gray-700' :
                          index === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <span className="font-medium text-[#1A1A1A]">{user.user_code}</span>
                          <p className="text-xs text-gray-500">{formatCurrency(user.total_value)} total</p>
                        </div>
                      </div>
                      <Badge variant="secondary">{user.quote_count} cotizaciones</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[150px] flex items-center justify-center text-gray-400">
                  No hay datos todavía
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
