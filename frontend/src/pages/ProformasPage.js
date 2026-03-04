import React, { useState, useEffect } from 'react';
import { API_URL, getToken, formatCurrency, formatDate, LOGO_URL } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { ScrollArea } from '../components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { FileText, Clock, CheckCircle, AlertTriangle, DollarSign, CreditCard, ChevronRight, User, Phone, Mail, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import BottomNav from '../components/BottomNav';

export default function ProformasPage() {
  const [proformas, setProformas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProforma, setSelectedProforma] = useState(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  const fetchProformas = async () => {
    try {
      const token = getToken();
      const response = await axios.get(`${API_URL}/quotes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProformas(response.data);
    } catch (error) {
      toast.error('Error al cargar proformas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProformas();
  }, []);

  const getStatusBadge = (proforma) => {
    if (proforma.status === 'pagado') {
      return <Badge className="bg-green-100 text-green-700 border-green-200">Pagado</Badge>;
    } else if (proforma.is_overdue) {
      return <Badge className="bg-red-100 text-red-700 border-red-200">Vencido</Badge>;
    } else if (proforma.status === 'parcial') {
      return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Parcial</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-700 border-gray-200">Pendiente</Badge>;
  };

  const getStatusIcon = (proforma) => {
    if (proforma.status === 'pagado') {
      return <CheckCircle className="text-green-500" size={20} />;
    } else if (proforma.is_overdue) {
      return <AlertTriangle className="text-red-500" size={20} />;
    } else if (proforma.status === 'parcial') {
      return <Clock className="text-yellow-500" size={20} />;
    }
    return <Clock className="text-gray-400" size={20} />;
  };

  const handlePayment = async (type) => {
    if (type === 'abono' && (!paymentAmount || parseFloat(paymentAmount) <= 0)) {
      toast.error('Ingrese un monto válido');
      return;
    }

    setPaymentLoading(true);
    try {
      const token = getToken();
      const response = await axios.post(
        `${API_URL}/quotes/${selectedProforma.id}/payments`,
        {
          amount: type === 'total' ? 0 : parseFloat(paymentAmount),
          payment_type: type
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(type === 'total' ? '¡Pago total registrado!' : '¡Abono registrado!');
      setSelectedProforma(response.data);
      setShowPaymentDialog(false);
      setPaymentAmount('');
      fetchProformas();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al registrar pago');
    } finally {
      setPaymentLoading(false);
    }
  };

  const filteredProformas = proformas.filter(p => {
    if (filter === 'all') return true;
    if (filter === 'pending') return p.status !== 'pagado';
    if (filter === 'overdue') return p.is_overdue;
    if (filter === 'paid') return p.status === 'pagado';
    return true;
  });

  const overdueCount = proformas.filter(p => p.is_overdue).length;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <img src={LOGO_URL} alt="Manrique" className="h-10" data-testid="proformas-logo" />
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-serif text-[#1A1A1A]">Mis Proformas</h1>
            {overdueCount > 0 && (
              <Badge className="bg-red-500 text-white animate-pulse">
                {overdueCount} vencidas
              </Badge>
            )}
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* Alert Banner for Overdue */}
        {overdueCount > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="text-red-500 flex-shrink-0" size={24} />
              <div>
                <p className="font-medium text-red-800">Atención: Proformas Vencidas</p>
                <p className="text-sm text-red-600">
                  Tienes {overdueCount} proforma(s) que han superado el tiempo de vencimiento
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filter Tabs */}
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" className="text-xs">Todas</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs">Pendientes</TabsTrigger>
            <TabsTrigger value="overdue" className="text-xs">Vencidas</TabsTrigger>
            <TabsTrigger value="paid" className="text-xs">Pagadas</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Proformas List */}
        <div className="space-y-3">
          {loading ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-8 text-center text-gray-400">
                Cargando proformas...
              </CardContent>
            </Card>
          ) : filteredProformas.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-8 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                <p className="text-gray-500">No hay proformas</p>
              </CardContent>
            </Card>
          ) : (
            filteredProformas.map((proforma) => (
              <Card 
                key={proforma.id} 
                className={`border-0 shadow-sm cursor-pointer transition-all hover:shadow-md ${
                  proforma.is_overdue ? 'ring-2 ring-red-200' : ''
                }`}
                onClick={() => setSelectedProforma(proforma)}
                data-testid={`proforma-${proforma.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {getStatusIcon(proforma)}
                      <div>
                        <p className="font-medium text-[#1A1A1A]">
                          {proforma.client_name || 'Sin cliente'}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatDate(proforma.created_at)}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          {getStatusBadge(proforma)}
                          <span className="text-xs text-gray-400">
                            {proforma.items?.length || 0} productos
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#1A1A1A]">
                        {formatCurrency(proforma.total_amount)}
                      </p>
                      {proforma.balance_pending > 0 && (
                        <p className="text-xs text-red-600 mt-1">
                          Pendiente: {formatCurrency(proforma.balance_pending)}
                        </p>
                      )}
                      <ChevronRight className="text-gray-300 mt-2 ml-auto" size={16} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>

      {/* Proforma Detail Dialog */}
      <Dialog open={!!selectedProforma && !showPaymentDialog} onOpenChange={() => setSelectedProforma(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <FileText size={20} />
              Detalle de Proforma
            </DialogTitle>
          </DialogHeader>

          {selectedProforma && (
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-4 py-2">
                {/* Status Card */}
                <div className={`p-4 rounded-lg ${
                  selectedProforma.status === 'pagado' ? 'bg-green-50' :
                  selectedProforma.is_overdue ? 'bg-red-50' : 'bg-gray-50'
                }`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600">Estado</p>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusIcon(selectedProforma)}
                        {getStatusBadge(selectedProforma)}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Vence</p>
                      <p className="text-sm font-medium">
                        {selectedProforma.due_date ? 
                          new Date(selectedProforma.due_date).toLocaleDateString('es-EC') : 
                          'N/A'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Client Info */}
                {(selectedProforma.client_name || selectedProforma.client_phone || selectedProforma.client_email) && (
                  <Card className="border-0 bg-gray-50">
                    <CardContent className="p-4 space-y-2">
                      <p className="text-xs font-medium text-gray-500 uppercase">Cliente</p>
                      {selectedProforma.client_name && (
                        <div className="flex items-center gap-2 text-sm">
                          <User size={14} className="text-gray-400" />
                          {selectedProforma.client_name}
                        </div>
                      )}
                      {selectedProforma.client_phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone size={14} className="text-gray-400" />
                          {selectedProforma.client_phone}
                        </div>
                      )}
                      {selectedProforma.client_email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail size={14} className="text-gray-400" />
                          {selectedProforma.client_email}
                        </div>
                      )}
                      {selectedProforma.client_address && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin size={14} className="text-gray-400" />
                          {selectedProforma.client_address}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Products */}
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-2">Productos</p>
                  <div className="space-y-2">
                    {selectedProforma.items?.map((item, idx) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm font-medium line-clamp-1">{item.product_name}</p>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>{item.quantity} x {formatCurrency(item.unit_price_applied)}</span>
                          <span className="font-medium text-[#1A1A1A]">{formatCurrency(item.subtotal)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <Card className="border-0 bg-[#1A1A1A] text-white">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Total</span>
                      <span>{formatCurrency(selectedProforma.total_amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Pagado</span>
                      <span className="text-green-400">{formatCurrency(selectedProforma.balance_paid)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t border-gray-700 pt-2">
                      <span>Pendiente</span>
                      <span className={selectedProforma.balance_pending > 0 ? 'text-red-400' : 'text-green-400'}>
                        {formatCurrency(selectedProforma.balance_pending)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          )}

          {/* Actions */}
          {selectedProforma && selectedProforma.status !== 'pagado' && (
            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowPaymentDialog(true);
                }}
                data-testid="register-payment-button"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Registrar Abono
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                onClick={() => handlePayment('total')}
                disabled={paymentLoading}
                data-testid="pay-total-button"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Pagar Total
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar Abono</DialogTitle>
            <DialogDescription>
              Saldo pendiente: {selectedProforma && formatCurrency(selectedProforma.balance_pending)}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium text-gray-700">Monto del abono</label>
            <div className="relative mt-2">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
                className="pl-10 h-12 text-lg"
                data-testid="payment-amount-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => handlePayment('abono')}
              disabled={paymentLoading}
              className="bg-[#D4A5A5] hover:bg-[#C29090] text-[#1A1A1A]"
              data-testid="confirm-payment-button"
            >
              {paymentLoading ? 'Procesando...' : 'Registrar Abono'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
