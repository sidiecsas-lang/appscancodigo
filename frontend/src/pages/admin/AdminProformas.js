import React, { useState, useEffect } from 'react';
import { API_URL, getToken, formatCurrency, formatDate } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { FileText, Settings, AlertTriangle, CheckCircle, Clock, DollarSign, Save, Eye, User } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import AdminLayout from '../../components/AdminLayout';

export default function AdminProformas() {
  const [proformas, setProformas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [settings, setSettings] = useState({ days_until_due: 30 });
  const [daysInput, setDaysInput] = useState('30');
  const [showSettings, setShowSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [selectedProforma, setSelectedProforma] = useState(null);
  const [summary, setSummary] = useState({});

  const fetchData = async () => {
    const token = getToken();
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [proformasRes, settingsRes, summaryRes] = await Promise.all([
        axios.get(`${API_URL}/quotes`, { headers }),
        axios.get(`${API_URL}/settings`, { headers }),
        axios.get(`${API_URL}/metrics/summary`, { headers })
      ]);

      setProformas(proformasRes.data);
      setSettings(settingsRes.data);
      setDaysInput(settingsRes.data.days_until_due.toString());
      setSummary(summaryRes.data);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveSettings = async () => {
    const days = parseInt(daysInput);
    if (isNaN(days) || days < 1) {
      toast.error('Ingrese un número válido de días');
      return;
    }

    setSavingSettings(true);
    try {
      const token = getToken();
      await axios.put(
        `${API_URL}/settings`,
        { days_until_due: days },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Configuración guardada');
      setShowSettings(false);
      fetchData(); // Refresh to update overdue calculations
    } catch (error) {
      toast.error('Error al guardar configuración');
    } finally {
      setSavingSettings(false);
    }
  };

  const getStatusBadge = (proforma) => {
    if (proforma.status === 'pagado') {
      return <Badge className="bg-green-100 text-green-700">Pagado</Badge>;
    } else if (proforma.is_overdue) {
      return <Badge className="bg-red-100 text-red-700">Vencido</Badge>;
    } else if (proforma.status === 'parcial') {
      return <Badge className="bg-yellow-100 text-yellow-700">Parcial</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-700">Pendiente</Badge>;
  };

  const filteredProformas = proformas.filter(p => {
    if (filter === 'all') return true;
    if (filter === 'pending') return p.status !== 'pagado';
    if (filter === 'overdue') return p.is_overdue;
    if (filter === 'paid') return p.status === 'pagado';
    if (filter === 'partial') return p.status === 'parcial';
    return true;
  });

  return (
    <AdminLayout>
      <div className="p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-serif text-[#1A1A1A]">Control de Proformas</h1>
            <p className="text-gray-500 mt-1">Gestión de proformas y cobranzas</p>
          </div>
          <Button
            onClick={() => setShowSettings(true)}
            variant="outline"
            data-testid="settings-button"
          >
            <Settings className="mr-2 h-4 w-4" />
            Configuración
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Proformas Totales</p>
                  <p className="text-2xl font-bold text-[#1A1A1A]" data-testid="total-proformas">
                    {summary.total_quotes || 0}
                  </p>
                </div>
                <FileText className="text-gray-300" size={24} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Vencidas</p>
                  <p className="text-2xl font-bold text-red-600" data-testid="overdue-count">
                    {summary.overdue_quotes || 0}
                  </p>
                </div>
                <AlertTriangle className="text-red-300" size={24} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm border-l-4 border-l-yellow-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Cartera Pendiente</p>
                  <p className="text-xl font-bold text-[#1A1A1A]" data-testid="pending-amount">
                    {formatCurrency(summary.total_pending_amount || 0)}
                  </p>
                </div>
                <DollarSign className="text-yellow-400" size={24} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Monto Vencido</p>
                  <p className="text-xl font-bold text-red-600" data-testid="overdue-amount">
                    {formatCurrency(summary.overdue_amount || 0)}
                  </p>
                </div>
                <AlertTriangle className="text-red-300" size={24} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="all">Todas ({proformas.length})</TabsTrigger>
            <TabsTrigger value="pending">Pendientes</TabsTrigger>
            <TabsTrigger value="partial">Parciales</TabsTrigger>
            <TabsTrigger value="overdue">Vencidas</TabsTrigger>
            <TabsTrigger value="paid">Pagadas</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Proformas Table */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader className="bg-gray-50/50 sticky top-0">
                  <TableRow>
                    <TableHead className="text-xs uppercase">ID</TableHead>
                    <TableHead className="text-xs uppercase">Usuario</TableHead>
                    <TableHead className="text-xs uppercase">Cliente</TableHead>
                    <TableHead className="text-xs uppercase">Creación</TableHead>
                    <TableHead className="text-xs uppercase">Vencimiento</TableHead>
                    <TableHead className="text-xs uppercase text-right">Total</TableHead>
                    <TableHead className="text-xs uppercase text-right">Pendiente</TableHead>
                    <TableHead className="text-xs uppercase text-center">Estado</TableHead>
                    <TableHead className="text-xs uppercase text-center">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10 text-gray-400">
                        Cargando proformas...
                      </TableCell>
                    </TableRow>
                  ) : filteredProformas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10 text-gray-400">
                        No hay proformas
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProformas.map((proforma) => (
                      <TableRow 
                        key={proforma.id} 
                        className={`hover:bg-gray-50/50 ${proforma.is_overdue ? 'bg-red-50/50' : ''}`}
                        data-testid={`proforma-row-${proforma.id}`}
                      >
                        <TableCell className="font-mono text-xs">
                          {proforma.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{proforma.user_code}</p>
                            <p className="text-xs text-gray-500">{proforma.user_name || '-'}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {proforma.client_name || '-'}
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">
                          {new Date(proforma.created_at).toLocaleDateString('es-EC')}
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">
                          {proforma.due_date ? 
                            new Date(proforma.due_date).toLocaleDateString('es-EC') : 
                            '-'
                          }
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(proforma.total_amount)}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${
                          proforma.balance_pending > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {formatCurrency(proforma.balance_pending)}
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(proforma)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedProforma(proforma)}
                            data-testid={`view-proforma-${proforma.id}`}
                          >
                            <Eye size={16} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Settings Dialog */}
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings size={20} />
                Configuración de Cobranza
              </DialogTitle>
              <DialogDescription>
                Configura el tiempo de vencimiento para las proformas
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div>
                <Label htmlFor="days">Días hasta vencimiento</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    id="days"
                    type="number"
                    min="1"
                    value={daysInput}
                    onChange={(e) => setDaysInput(e.target.value)}
                    className="text-lg"
                    data-testid="days-input"
                  />
                  <span className="text-gray-500">días</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Las proformas se marcarán como vencidas después de este período
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSettings(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="bg-[#D4A5A5] hover:bg-[#C29090] text-[#1A1A1A]"
                data-testid="save-settings-button"
              >
                <Save className="mr-2 h-4 w-4" />
                {savingSettings ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Proforma Detail Dialog */}
        <Dialog open={!!selectedProforma} onOpenChange={() => setSelectedProforma(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-serif">Detalle de Proforma</DialogTitle>
            </DialogHeader>
            {selectedProforma && (
              <div className="space-y-4 py-2">
                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">ID</p>
                    <p className="font-mono">{selectedProforma.id.slice(0, 16)}...</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Estado</p>
                    {getStatusBadge(selectedProforma)}
                  </div>
                  <div>
                    <p className="text-gray-500">Usuario</p>
                    <p>{selectedProforma.user_name || selectedProforma.user_code}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Cliente</p>
                    <p>{selectedProforma.client_name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Fecha Creación</p>
                    <p>{formatDate(selectedProforma.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Fecha Vencimiento</p>
                    <p>{selectedProforma.due_date ? 
                      new Date(selectedProforma.due_date).toLocaleDateString('es-EC') : '-'
                    }</p>
                  </div>
                </div>

                {/* Products */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Productos</p>
                  <div className="bg-gray-50 rounded-lg p-3 max-h-40 overflow-auto space-y-2">
                    {selectedProforma.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="truncate flex-1">{item.product_name}</span>
                        <span className="ml-2">{item.quantity} x {formatCurrency(item.unit_price_applied)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="bg-gray-900 text-white rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total</span>
                    <span>{formatCurrency(selectedProforma.total_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Pagado</span>
                    <span className="text-green-400">{formatCurrency(selectedProforma.balance_paid)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t border-gray-700 pt-2">
                    <span>Pendiente</span>
                    <span className={selectedProforma.balance_pending > 0 ? 'text-red-400' : 'text-green-400'}>
                      {formatCurrency(selectedProforma.balance_pending)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
