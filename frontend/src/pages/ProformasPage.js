import React, { useState, useEffect } from 'react';
import { API_URL, getToken, formatCurrency, formatDate, LOGO_URL, getUser } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { ScrollArea } from '../components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { FileText, Clock, CheckCircle, AlertTriangle, DollarSign, CreditCard, ChevronRight, User, Phone, Mail, MapPin, Search, Pencil, Minus, Plus, Trash2, Edit, Download, CreditCard as IdCard } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import BottomNav from '../components/BottomNav';

export default function ProformasPage() {
  const [proformas, setProformas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProforma, setSelectedProforma] = useState(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  // Edit state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editClientName, setEditClientName] = useState('');
  const [editClientIdNumber, setEditClientIdNumber] = useState('');
  const [editClientCity, setEditClientCity] = useState('');
  const [editClientPhone, setEditClientPhone] = useState('');
  const [editClientEmail, setEditClientEmail] = useState('');
  const [editClientAddress, setEditClientAddress] = useState('');
  const [editItems, setEditItems] = useState([]);
  const [editSearchTerm, setEditSearchTerm] = useState('');
  const [editSearchResults, setEditSearchResults] = useState([]);
  const [editLoading, setEditLoading] = useState(false);
  const [editingPriceId, setEditingPriceId] = useState(null);
  const [editSaved, setEditSaved] = useState(false);
  const [editQtyDisplayValues, setEditQtyDisplayValues] = useState({});

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

  // Product search for edit modal
  useEffect(() => {
    if (editSearchTerm.length < 2) { setEditSearchResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const token = getToken();
        const res = await axios.get(`${API_URL}/products`, {
          params: { search: editSearchTerm },
          headers: { Authorization: `Bearer ${token}` }
        });
        setEditSearchResults(res.data.slice(0, 10));
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [editSearchTerm]);

  const openEditDialog = (proforma) => {
    setEditClientName(proforma.client_name || '');
    setEditClientIdNumber(proforma.client_id_number || '');
    setEditClientCity(proforma.client_city || '');
    setEditClientPhone(proforma.client_phone || '');
    setEditClientEmail(proforma.client_email || '');
    setEditClientAddress(proforma.client_address || '');
    setEditItems(proforma.items.map(item => ({
      product_id: item.product_id,
      product_name: item.product_name,
      product_code: item.product_code,
      product_price_1: item.unit_price_applied,
      quantity: item.quantity,
      manualPrice: item.price_was_manual ? item.unit_price_applied : null
    })));
    setEditSaved(false);
    setEditSearchTerm('');
    setEditSearchResults([]);
    setEditQtyDisplayValues({});
    setShowEditDialog(true);
  };

  const addEditItem = (product) => {
    const existing = editItems.find(i => i.product_id === product.id);
    if (existing) {
      setEditItems(prev => prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setEditItems(prev => [...prev, {
        product_id: product.id,
        product_name: product.name,
        product_code: product.internal_code,
        product_price_1: product.price_1,
        quantity: 1,
        manualPrice: null
      }]);
    }
    setEditSearchTerm('');
    setEditSearchResults([]);
    toast.success('Producto agregado');
  };

  const updateEditQuantity = (productId, qty) => {
    if (qty < 1) return;
    setEditItems(prev => prev.map(i => i.product_id === productId ? { ...i, quantity: qty } : i));
  };

  const removeEditItem = (productId) => {
    setEditItems(prev => prev.filter(i => i.product_id !== productId));
  };

  const updateEditManualPrice = (productId, price) => {
    setEditItems(prev => prev.map(i => i.product_id === productId ? { ...i, manualPrice: price } : i));
  };

  const editTotal = editItems.reduce((sum, i) => {
    const p = i.manualPrice && i.manualPrice > 0 ? i.manualPrice : i.product_price_1;
    return sum + p * i.quantity;
  }, 0);

  const handleSaveEdit = async () => {
    if (editItems.length === 0) { toast.error('Agregue al menos un producto'); return; }
    setEditLoading(true);
    try {
      const token = getToken();
      const response = await axios.put(
        `${API_URL}/quotes/${selectedProforma.id}/items`,
        {
          client_name: editClientName || null,
          client_email: editClientEmail || null,
          client_phone: editClientPhone || null,
          client_address: editClientAddress || null,
          client_id_number: editClientIdNumber || null,
          client_city: editClientCity || null,
          items: editItems.map(i => ({
            product_id: i.product_id,
            quantity: i.quantity,
            is_bulk: false,
            manual_price: i.manualPrice || null
          }))
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedProforma(response.data);
      setEditSaved(true);
      toast.success('Proforma actualizada exitosamente');
      fetchProformas();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar cambios');
    } finally {
      setEditLoading(false);
    }
  };

  const generateProformaPDF = (proforma) => {
    const doc = new jsPDF();
    doc.setFillColor(26, 26, 26);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('MANRIQUE IMPORTADORA', 105, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Productos de Belleza', 105, 22, { align: 'center' });
    doc.setTextColor(26, 26, 26);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('COTIZACIÓN', 105, 50, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const date = new Date(proforma.created_at).toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' });
    let yPos = 60;
    doc.text(`Fecha: ${date}`, 14, yPos); yPos += 6;
    const vendorName = proforma.user_name || proforma.user_code || 'N/A';
    doc.text(`Vendedor: ${vendorName}`, 14, yPos); yPos += 6;
    if (proforma.client_name) { doc.text(`Cliente: ${proforma.client_name}`, 14, yPos); yPos += 6; }
    if (proforma.client_id_number) { doc.text(`Cédula/RUC: ${proforma.client_id_number}`, 14, yPos); yPos += 6; }
    if (proforma.client_city) { doc.text(`Ciudad: ${proforma.client_city}`, 14, yPos); yPos += 6; }
    if (proforma.client_phone) { doc.text(`Teléfono: ${proforma.client_phone}`, 14, yPos); yPos += 6; }
    if (proforma.client_email) { doc.text(`Email: ${proforma.client_email}`, 14, yPos); yPos += 6; }
    if (proforma.client_address) { doc.text(`Dirección: ${proforma.client_address}`, 14, yPos); yPos += 6; }
    const tableData = proforma.items.map(item => [
      item.product_code,
      item.product_name.substring(0, 40),
      item.quantity,
      item.price_was_manual ? 'Especial' : 'Precio 1',
      formatCurrency(item.unit_price_applied),
      formatCurrency(item.subtotal)
    ]);
    const hasManual = proforma.items.some(i => i.price_was_manual);
    autoTable(doc, {
      startY: yPos + 6,
      head: [['Código', 'Producto', 'Cant.', 'Tipo', 'P. Unit.', 'Subtotal']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [212, 165, 165], textColor: [26, 26, 26], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 248, 248] },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 65 }, 2: { cellWidth: 15, halign: 'center' }, 3: { cellWidth: 20, halign: 'center' }, 4: { cellWidth: 25, halign: 'right' }, 5: { cellWidth: 30, halign: 'right' } }
    });
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFillColor(26, 26, 26);
    doc.rect(120, finalY, 76, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL: ${formatCurrency(proforma.total_amount)}`, 158, finalY + 8, { align: 'center' });
    if (hasManual) {
      doc.setTextColor(180, 120, 0);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text('(*) Tipo "Especial": precio acordado con el cliente.', 14, finalY + 20);
    }
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Esta cotización es válida por 7 días. Precios sujetos a cambio sin previo aviso.', 105, 280, { align: 'center' });
    return doc;
  };

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
                {(selectedProforma.client_name || selectedProforma.client_phone || selectedProforma.client_email || selectedProforma.client_id_number || selectedProforma.client_city) && (
                  <Card className="border-0 bg-gray-50">
                    <CardContent className="p-4 space-y-2">
                      <p className="text-xs font-medium text-gray-500 uppercase">Cliente</p>
                      {selectedProforma.client_name && (
                        <div className="flex items-center gap-2 text-sm">
                          <User size={14} className="text-gray-400" />
                          {selectedProforma.client_name}
                        </div>
                      )}
                      {selectedProforma.client_id_number && (
                        <div className="flex items-center gap-2 text-sm">
                          <IdCard size={14} className="text-gray-400" />
                          <span className="text-gray-500 text-xs">Cédula/RUC:</span> {selectedProforma.client_id_number}
                        </div>
                      )}
                      {selectedProforma.client_city && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin size={14} className="text-gray-400" />
                          {selectedProforma.client_city}
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
            <div className="space-y-3 pt-4 border-t">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setShowPaymentDialog(true); }}
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
              <Button
                variant="outline"
                className="w-full border-[#D4A5A5] text-[#D4A5A5] hover:bg-[#D4A5A5]/10"
                onClick={() => openEditDialog(selectedProforma)}
                data-testid="edit-proforma-button"
              >
                <Edit className="mr-2 h-4 w-4" />
                Editar Proforma
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

      {/* Edit Proforma Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => { if (!open) setShowEditDialog(false); }}>
        <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <Edit size={20} />
              Editar Proforma
            </DialogTitle>
            <DialogDescription>
              Modifica los datos del cliente y los productos. Los pagos previos no se revertirán.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-4 py-2">
              {/* Client Data */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-3">Datos del Cliente</p>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm">Nombre</Label>
                      <Input value={editClientName} onChange={e => setEditClientName(e.target.value)} placeholder="Nombre del cliente" className="mt-1" data-testid="edit-client-name" />
                    </div>
                    <div>
                      <Label className="text-sm">Cédula / RUC</Label>
                      <Input
                        value={editClientIdNumber}
                        onChange={e => setEditClientIdNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="1234567890"
                        maxLength={13}
                        className="mt-1"
                        data-testid="edit-client-id-number"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm">Ciudad</Label>
                      <Input value={editClientCity} onChange={e => setEditClientCity(e.target.value)} placeholder="Guayaquil" className="mt-1" data-testid="edit-client-city" />
                    </div>
                    <div>
                      <Label className="text-sm">Teléfono</Label>
                      <Input value={editClientPhone} onChange={e => setEditClientPhone(e.target.value)} placeholder="0999999999" className="mt-1" data-testid="edit-client-phone" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm">Correo</Label>
                      <Input type="email" value={editClientEmail} onChange={e => setEditClientEmail(e.target.value)} placeholder="correo@ejemplo.com" className="mt-1" data-testid="edit-client-email" />
                    </div>
                    <div>
                      <Label className="text-sm">Dirección</Label>
                      <Input value={editClientAddress} onChange={e => setEditClientAddress(e.target.value)} placeholder="Dirección" className="mt-1" data-testid="edit-client-address" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Search */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Agregar Producto</p>
                <div className="relative">
                  <Input
                    value={editSearchTerm}
                    onChange={e => setEditSearchTerm(e.target.value)}
                    placeholder="Buscar por nombre o código..."
                    className="pr-8"
                    data-testid="edit-product-search"
                  />
                  <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  {editSearchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-auto">
                      {editSearchResults.map(product => (
                        <button key={product.id} onClick={() => addEditItem(product)} className="w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors" data-testid={`edit-search-result-${product.id}`}>
                          <p className="font-medium text-sm text-[#1A1A1A] line-clamp-1">{product.name}</p>
                          <p className="text-xs text-gray-500">{product.internal_code} · {formatCurrency(product.price_1)}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Edit Items */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                  Productos ({editItems.length}) · Total: {formatCurrency(editTotal)}
                </p>
                {editItems.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No hay productos</p>
                ) : (
                  <div className="relative">
                    <div
                      className="edit-items-list space-y-2 overflow-y-auto pr-1"
                      style={{ maxHeight: '35vh' }}
                    >
                      {editItems.map((item) => {
                      const unitPrice = item.manualPrice && item.manualPrice > 0 ? item.manualPrice : item.product_price_1;
                      const isPriceManual = item.manualPrice && item.manualPrice > 0;
                      return (
                        <div key={item.product_id} className="bg-gray-50 rounded-lg p-3" data-testid={`edit-item-${item.product_id}`}>
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm line-clamp-1">{item.product_name}</p>
                              <p className="text-xs text-gray-500">{item.product_code}</p>
                            </div>
                            <button onClick={() => removeEditItem(item.product_id)} className="p-1 text-gray-400 hover:text-red-500 ml-2" data-testid={`edit-remove-${item.product_id}`}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => updateEditQuantity(item.product_id, item.quantity - 1)}>
                                <Minus size={12} />
                              </Button>
                              <input
                                type="number"
                                min="1"
                                step="1"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={editQtyDisplayValues[item.product_id] !== undefined ? editQtyDisplayValues[item.product_id] : item.quantity}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  setEditQtyDisplayValues(prev => ({ ...prev, [item.product_id]: raw }));
                                  const val = parseInt(raw, 10);
                                  if (!isNaN(val) && val >= 1) updateEditQuantity(item.product_id, val);
                                }}
                                onFocus={(e) => e.target.select()}
                                onBlur={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  updateEditQuantity(item.product_id, (!isNaN(val) && val >= 1) ? val : 1);
                                  setEditQtyDisplayValues(prev => { const n = { ...prev }; delete n[item.product_id]; return n; });
                                }}
                                onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                                className="edit-qty-input h-7 w-[52px] text-center text-sm font-medium border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#D4A5A5]"
                                data-testid={`edit-qty-${item.product_id}`}
                              />
                              <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => updateEditQuantity(item.product_id, item.quantity + 1)}>
                                <Plus size={12} />
                              </Button>
                            </div>
                            <div className="flex items-center gap-1">
                              {editingPriceId === item.product_id ? (
                                <Input
                                  type="number" step="0.01" min="0.01"
                                  defaultValue={unitPrice}
                                  className="h-7 w-24 text-sm"
                                  autoFocus
                                  onBlur={e => {
                                    const val = parseFloat(e.target.value);
                                    updateEditManualPrice(item.product_id, (!isNaN(val) && val > 0) ? val : null);
                                    setEditingPriceId(null);
                                  }}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') e.target.blur();
                                    if (e.key === 'Escape') { updateEditManualPrice(item.product_id, null); setEditingPriceId(null); }
                                  }}
                                  data-testid={`edit-price-input-${item.product_id}`}
                                />
                              ) : (
                                <>
                                  <span className="text-xs text-gray-500">{formatCurrency(unitPrice)} x {item.quantity}</span>
                                  {isPriceManual && <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300 bg-amber-50">Especial</Badge>}
                                  <button onClick={() => setEditingPriceId(item.product_id)} className="p-1 text-gray-400 hover:text-[#D4A5A5]" data-testid={`edit-price-btn-${item.product_id}`}>
                                    <Pencil size={11} />
                                  </button>
                                </>
                              )}
                              <span className="font-medium text-sm ml-1">{formatCurrency(unitPrice * item.quantity)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    </div>
                    {editItems.length > 2 && (
                      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent" />
                    )}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          <div className="pt-4 border-t space-y-3">
            {editSaved && (
              <Button
                variant="outline"
                className="w-full border-green-500 text-green-600 hover:bg-green-50"
                onClick={() => {
                  const doc = generateProformaPDF(selectedProforma);
                  doc.save(`Proforma_Manrique_${selectedProforma.id.slice(0, 8)}.pdf`);
                }}
                data-testid="download-updated-pdf-button"
              >
                <Download className="mr-2 h-4 w-4" />
                Descargar PDF Actualizado
              </Button>
            )}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowEditDialog(false)}>
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-[#D4A5A5] hover:bg-[#C29090] text-[#1A1A1A] font-medium"
                onClick={handleSaveEdit}
                disabled={editLoading}
                data-testid="save-edit-button"
              >
                {editLoading ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />

      <style>{`
        .edit-qty-input::-webkit-inner-spin-button,
        .edit-qty-input::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .edit-qty-input {
          -moz-appearance: textfield;
        }
        .edit-items-list {
          scrollbar-width: thin;
          scrollbar-color: #D4A5A5 transparent;
        }
        .edit-items-list::-webkit-scrollbar {
          width: 4px;
        }
        .edit-items-list::-webkit-scrollbar-thumb {
          background-color: #D4A5A5;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}
