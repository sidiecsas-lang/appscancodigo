import React, { useState, useEffect } from 'react';
import { API_URL, getToken, formatCurrency, LOGO_URL, getUser } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { ScrollArea } from '../components/ui/scroll-area';
import { Search, Plus, Minus, Trash2, FileText, Share2, Package, ShoppingCart, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import BottomNav from '../components/BottomNav';

export default function QuoterPage() {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [quoteItems, setQuoteItems] = useState([]);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientIdNumber, setClientIdNumber] = useState('');
  const [clientCity, setClientCity] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editingPriceId, setEditingPriceId] = useState(null);

  // Search products
  useEffect(() => {
    const searchProducts = async () => {
      if (searchTerm.length < 2) {
        setSearchResults([]);
        return;
      }
      
      try {
        const token = getToken();
        const response = await axios.get(`${API_URL}/products`, {
          params: { search: searchTerm },
          headers: { Authorization: `Bearer ${token}` }
        });
        setSearchResults(response.data.slice(0, 10));
      } catch (error) {
        console.error('Error searching products:', error);
      }
    };

    const debounce = setTimeout(searchProducts, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm]);

  // Check for pending product from scanner
  useEffect(() => {
    const pendingProduct = localStorage.getItem('pendingQuoteProduct');
    if (pendingProduct) {
      try {
        const product = JSON.parse(pendingProduct);
        // Remove from localStorage immediately
        localStorage.removeItem('pendingQuoteProduct');
        // Add to quote
        const existing = quoteItems.find(item => item.product.id === product.id);
        if (existing) {
          setQuoteItems(prev => prev.map(item => 
            item.product.id === product.id 
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ));
          toast.success('Cantidad actualizada');
        } else {
          setQuoteItems(prev => [...prev, {
            product,
            quantity: 1,
            manualPrice: null
          }]);
          toast.success('Producto agregado desde escáner');
        }
      } catch (e) {
        console.error('Error parsing pending product:', e);
        localStorage.removeItem('pendingQuoteProduct');
      }
    }
  }, []);

  // Add product to quote
  const addToQuote = (product) => {
    const existing = quoteItems.find(item => item.product.id === product.id);
    if (existing) {
      updateQuantity(product.id, existing.quantity + 1);
    } else {
      setQuoteItems([...quoteItems, {
        product,
        quantity: 1,
        manualPrice: null
      }]);
    }
    setSearchTerm('');
    setSearchResults([]);
    setShowSearch(false);
    toast.success('Producto agregado');
  };

  // Update quantity
  const updateQuantity = (productId, newQty) => {
    if (newQty < 1) return;
    setQuoteItems(quoteItems.map(item => 
      item.product.id === productId 
        ? { ...item, quantity: newQty }
        : item
    ));
  };

  // Update manual price
  const updateManualPrice = (productId, price) => {
    setQuoteItems(quoteItems.map(item =>
      item.product.id === productId
        ? { ...item, manualPrice: price }
        : item
    ));
  };

  // Remove item
  const removeItem = (productId) => {
    setQuoteItems(quoteItems.filter(item => item.product.id !== productId));
    toast.success('Producto eliminado');
  };

  // Calculate totals
  const calculateSubtotal = (item) => {
    const unitPrice = item.manualPrice && item.manualPrice > 0 ? item.manualPrice : item.product.price_1;
    return unitPrice * item.quantity;
  };

  const total = quoteItems.reduce((sum, item) => sum + calculateSubtotal(item), 0);

  // Generate PDF
  const generatePDF = async () => {
    const user = getUser();
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(26, 26, 26);
    doc.rect(0, 0, 210, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('MANRIQUE IMPORTADORA', 105, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Productos de Belleza', 105, 22, { align: 'center' });
    
    // Quote info
    doc.setTextColor(26, 26, 26);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('COTIZACIÓN', 105, 50, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const date = new Date().toLocaleDateString('es-EC', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    let yPos = 60;
    doc.text(`Fecha: ${date}`, 14, yPos);
    yPos += 6;
    
    // Vendedor info
    const vendorName = user?.name || user?.user_code || 'N/A';
    doc.text(`Vendedor: ${vendorName}`, 14, yPos);
    yPos += 6;
    
    // Client info
    if (clientName) {
      doc.text(`Cliente: ${clientName}`, 14, yPos);
      yPos += 6;
    }
    if (clientIdNumber) {
      doc.text(`Cédula/RUC: ${clientIdNumber}`, 14, yPos);
      yPos += 6;
    }
    if (clientCity) {
      doc.text(`Ciudad: ${clientCity}`, 14, yPos);
      yPos += 6;
    }
    if (clientPhone) {
      doc.text(`Teléfono: ${clientPhone}`, 14, yPos);
      yPos += 6;
    }
    if (clientEmail) {
      doc.text(`Email: ${clientEmail}`, 14, yPos);
      yPos += 6;
    }
    if (clientAddress) {
      doc.text(`Dirección: ${clientAddress}`, 14, yPos);
      yPos += 6;
    }
    
    // Table
    const tableData = quoteItems.map(item => {
      const unitPrice = item.manualPrice && item.manualPrice > 0 ? item.manualPrice : item.product.price_1;
      const isPriceManual = item.manualPrice && item.manualPrice > 0;
      return [
        item.product.internal_code,
        item.product.name.substring(0, 40),
        item.quantity,
        isPriceManual ? 'Especial' : 'Precio 1',
        formatCurrency(unitPrice),
        formatCurrency(unitPrice * item.quantity)
      ];
    });
    
    const hasManualPrices = quoteItems.some(i => i.manualPrice && i.manualPrice > 0);
    
    autoTable(doc, {
      startY: yPos + 6,
      head: [['Código', 'Producto', 'Cant.', 'Tipo', 'P. Unit.', 'Subtotal']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [212, 165, 165],
        textColor: [26, 26, 26],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [248, 248, 248]
      },
      styles: {
        fontSize: 9,
        cellPadding: 4
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 65 },
        2: { cellWidth: 15, halign: 'center' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 30, halign: 'right' }
      }
    });
    
    // Total
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFillColor(26, 26, 26);
    doc.rect(120, finalY, 76, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL: ${formatCurrency(total)}`, 158, finalY + 8, { align: 'center' });
    
    // Note for manual prices
    if (hasManualPrices) {
      doc.setTextColor(180, 120, 0);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text('(*) Tipo "Especial": precio acordado con el cliente, diferente al precio de catálogo.', 14, finalY + 20);
    }
    
    // Footer
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Esta cotización es válida por 7 días. Precios sujetos a cambio sin previo aviso.', 105, 280, { align: 'center' });
    
    return doc;
  };

  // Save and download PDF
  const handleGeneratePDF = async () => {
    if (quoteItems.length === 0) {
      toast.error('Agregue productos a la cotización');
      return;
    }

    setLoading(true);
    try {
      // Save quote to backend
      const token = getToken();
      await axios.post(`${API_URL}/quotes`, {
        client_name: clientName || null,
        client_email: clientEmail || null,
        client_phone: clientPhone || null,
        client_address: clientAddress || null,
        client_id_number: clientIdNumber || null,
        client_city: clientCity || null,
        items: quoteItems.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          is_bulk: false,
          manual_price: item.manualPrice || null
        }))
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Generate and download PDF
      const doc = await generatePDF();
      doc.save(`Cotizacion_Manrique_${Date.now()}.pdf`);
      
      toast.success('Cotización guardada y PDF generado');
    } catch (error) {
      toast.error('Error al generar la cotización');
    } finally {
      setLoading(false);
    }
  };

  // Share
  const handleShare = async () => {
    if (quoteItems.length === 0) {
      toast.error('Agregue productos a la cotización');
      return;
    }

    try {
      const doc = await generatePDF();
      const pdfBlob = doc.output('blob');
      const file = new File([pdfBlob], `Cotizacion_Manrique_${Date.now()}.pdf`, { type: 'application/pdf' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Cotización Manrique Importadora',
          text: `Cotización por ${formatCurrency(total)}`,
          files: [file]
        });
      } else {
        // Fallback to WhatsApp
        const message = encodeURIComponent(
          `*Cotización Manrique Importadora*\n` +
          `Total: ${formatCurrency(total)}\n` +
          `${quoteItems.length} producto(s)\n\n` +
          quoteItems.map(item => 
            `• ${item.product.name} x${item.quantity}`
          ).join('\n')
        );
        window.open(`https://wa.me/?text=${message}`, '_blank');
      }
    } catch (error) {
      toast.error('Error al compartir');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <img src={LOGO_URL} alt="Manrique" className="h-10" data-testid="quoter-logo" />
          <h1 className="text-lg font-serif text-[#1A1A1A]">Cotizador</h1>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* Client Info */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Datos del Cliente (opcional)</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <div>
              <Label htmlFor="clientName" className="text-sm font-medium text-gray-700">
                Nombre
              </Label>
              <Input
                id="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Nombre del cliente"
                className="mt-1 bg-gray-50/50"
                data-testid="client-name-input"
              />
            </div>
            <div>
              <Label htmlFor="clientIdNumber" className="text-sm font-medium text-gray-700">
                Cédula / RUC
              </Label>
              <Input
                id="clientIdNumber"
                value={clientIdNumber}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '');
                  setClientIdNumber(v);
                }}
                placeholder="1234567890 (10 o 13 dígitos)"
                maxLength={13}
                className="mt-1 bg-gray-50/50"
                data-testid="client-id-number-input"
              />
              {clientIdNumber && clientIdNumber.length !== 10 && clientIdNumber.length !== 13 && (
                <p className="text-xs text-amber-600 mt-1">Debe tener 10 o 13 dígitos</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="clientPhone" className="text-sm font-medium text-gray-700">
                  Teléfono
                </Label>
                <Input
                  id="clientPhone"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="0999999999"
                  className="mt-1 bg-gray-50/50"
                  data-testid="client-phone-input"
                />
              </div>
              <div>
                <Label htmlFor="clientEmail" className="text-sm font-medium text-gray-700">
                  Correo
                </Label>
                <Input
                  id="clientEmail"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="mt-1 bg-gray-50/50"
                  data-testid="client-email-input"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="clientCity" className="text-sm font-medium text-gray-700">
                  Ciudad
                </Label>
                <Input
                  id="clientCity"
                  value={clientCity}
                  onChange={(e) => setClientCity(e.target.value)}
                  placeholder="Guayaquil"
                  className="mt-1 bg-gray-50/50"
                  data-testid="client-city-input"
                />
              </div>
              <div>
                <Label htmlFor="clientAddress" className="text-sm font-medium text-gray-700">
                  Dirección
                </Label>
                <Input
                  id="clientAddress"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  placeholder="Dirección del cliente"
                  className="mt-1 bg-gray-50/50"
                  data-testid="client-address-input"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search / Add Products */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Search size={16} />
              Buscar Productos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="relative">
              <Input
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowSearch(true);
                }}
                onFocus={() => setShowSearch(true)}
                placeholder="Buscar por nombre o código..."
                className="bg-gray-50/50"
                data-testid="product-search-input"
              />
              
              {/* Search Results */}
              {showSearch && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-auto">
                  {searchResults.map(product => (
                    <button
                      key={product.id}
                      onClick={() => addToQuote(product)}
                      className="w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors"
                      data-testid={`search-result-${product.id}`}
                    >
                      <p className="font-medium text-sm text-[#1A1A1A] line-clamp-1">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.internal_code}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quote Items */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShoppingCart size={16} />
                Productos ({quoteItems.length})
              </span>
              {quoteItems.length > 0 && (
                <Badge variant="secondary" className="bg-[#D4A5A5]/10 text-[#D4A5A5]">
                  {formatCurrency(total)}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {quoteItems.length === 0 ? (
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                <p className="text-gray-500 text-sm">No hay productos agregados</p>
                <p className="text-gray-400 text-xs mt-1">Busque y agregue productos a su cotización</p>
              </div>
            ) : (
              <div className="space-y-3">
                {quoteItems.map((item) => {
                  const unitPrice = item.manualPrice && item.manualPrice > 0 ? item.manualPrice : item.product.price_1;
                  const subtotal = unitPrice * item.quantity;
                  const isPriceManual = item.manualPrice && item.manualPrice > 0;
                  
                  return (
                    <div 
                      key={item.product.id}
                      className="bg-gray-50 rounded-lg p-3 space-y-2"
                      data-testid={`quote-item-${item.product.id}`}
                    >
                      {/* Product Info */}
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-[#1A1A1A] line-clamp-2">
                            {item.product.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">{item.product.internal_code}</p>
                        </div>
                        <button
                          onClick={() => removeItem(item.product.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                          data-testid={`remove-item-${item.product.id}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      
                      {/* Quantity controls */}
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          data-testid={`decrease-qty-${item.product.id}`}
                        >
                          <Minus size={14} />
                        </Button>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={item.quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val) && val >= 1) {
                              updateQuantity(item.product.id, val);
                            }
                          }}
                          onBlur={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (isNaN(val) || val < 1) {
                              updateQuantity(item.product.id, 1);
                            }
                          }}
                          className="quoter-qty-input h-8 w-[60px] text-center font-medium text-sm border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#D4A5A5]"
                          data-testid={`quantity-${item.product.id}`}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          data-testid={`increase-qty-${item.product.id}`}
                        >
                          <Plus size={14} />
                        </Button>
                      </div>
                      
                      {/* Price Info */}
                      <div className="flex items-center justify-between pt-1 border-t border-gray-200">
                        <div className="flex items-center gap-1 flex-wrap">
                          {editingPriceId === item.product.id ? (
                            <Input
                              type="number"
                              step="0.01"
                              min="0.01"
                              defaultValue={unitPrice}
                              className="h-7 w-24 text-sm"
                              autoFocus
                              onBlur={(e) => {
                                const val = parseFloat(e.target.value);
                                updateManualPrice(item.product.id, (!isNaN(val) && val > 0) ? val : null);
                                setEditingPriceId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') e.target.blur();
                                if (e.key === 'Escape') {
                                  updateManualPrice(item.product.id, null);
                                  setEditingPriceId(null);
                                }
                              }}
                              data-testid={`price-input-${item.product.id}`}
                            />
                          ) : (
                            <>
                              <span className="text-xs text-gray-500">
                                {formatCurrency(unitPrice)} x {item.quantity}
                              </span>
                              {isPriceManual && (
                                <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300 bg-amber-50">
                                  Precio especial
                                </Badge>
                              )}
                              <button
                                onClick={() => setEditingPriceId(item.product.id)}
                                className="p-1 text-gray-400 hover:text-[#D4A5A5] transition-colors"
                                title="Editar precio"
                                data-testid={`edit-price-${item.product.id}`}
                              >
                                <Pencil size={12} />
                              </button>
                            </>
                          )}
                        </div>
                        <span className="font-medium text-[#1A1A1A]" data-testid={`subtotal-${item.product.id}`}>
                          {formatCurrency(subtotal)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        {quoteItems.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleGeneratePDF}
              disabled={loading}
              className="h-12 bg-[#D4A5A5] hover:bg-[#C29090] text-[#1A1A1A] font-medium"
              data-testid="generate-pdf-button"
            >
              <FileText className="mr-2 h-4 w-4" />
              Generar PDF
            </Button>
            <Button
              onClick={handleShare}
              variant="outline"
              className="h-12"
              data-testid="share-button"
            >
              <Share2 className="mr-2 h-4 w-4" />
              Compartir
            </Button>
          </div>
        )}
      </main>

      <BottomNav />

      <style>{`
        .quoter-qty-input::-webkit-inner-spin-button,
        .quoter-qty-input::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .quoter-qty-input {
          -moz-appearance: textfield;
        }
      `}</style>
    </div>
  );
}
