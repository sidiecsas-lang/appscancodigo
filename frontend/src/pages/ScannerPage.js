import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { API_URL, getToken, formatCurrency, LOGO_URL } from '../lib/utils';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Camera, X, Package, Barcode, Tag } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import BottomNav from '../components/BottomNav';

export default function ScannerPage() {
  const [scanning, setScanning] = useState(false);
  const [product, setProduct] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const scannerRef = useRef(null);
  const scannerInstanceRef = useRef(null);

  const startScanner = () => {
    setScanning(true);
    
    setTimeout(() => {
      if (scannerRef.current && !scannerInstanceRef.current) {
        scannerInstanceRef.current = new Html5QrcodeScanner(
          "scanner-container",
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            showTorchButtonIfSupported: true,
            showZoomSliderIfSupported: true,
          },
          false
        );

        scannerInstanceRef.current.render(onScanSuccess, onScanError);
      }
    }, 100);
  };

  const stopScanner = () => {
    if (scannerInstanceRef.current) {
      scannerInstanceRef.current.clear().catch(console.error);
      scannerInstanceRef.current = null;
    }
    setScanning(false);
  };

  const onScanSuccess = async (decodedText) => {
    stopScanner();
    
    try {
      const token = getToken();
      const response = await axios.get(`${API_URL}/products/scan/${decodedText}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setProduct(response.data);
      setShowModal(true);
      
      // Log the scan silently
      await axios.post(`${API_URL}/scan-logs`, 
        { product_id: response.data.id },
        { headers: { Authorization: `Bearer ${token}` }}
      ).catch(() => {}); // Silent fail
      
    } catch (error) {
      toast.error('Producto no encontrado');
    }
  };

  const onScanError = (error) => {
    // Silent - expected during scanning
  };

  useEffect(() => {
    return () => {
      if (scannerInstanceRef.current) {
        scannerInstanceRef.current.clear().catch(console.error);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <img src={LOGO_URL} alt="Manrique" className="h-10" data-testid="scanner-logo" />
          <h1 className="text-lg font-serif text-[#1A1A1A]">Escáner</h1>
        </div>
      </header>

      {/* Content */}
      <main className="p-4">
        {!scanning ? (
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardContent className="p-8 text-center">
              <div className="w-24 h-24 mx-auto mb-6 bg-[#D4A5A5]/10 rounded-full flex items-center justify-center">
                <Camera className="w-12 h-12 text-[#D4A5A5]" />
              </div>
              <h2 className="text-xl font-serif text-[#1A1A1A] mb-2">
                Escanear Producto
              </h2>
              <p className="text-gray-500 mb-6">
                Apunta la cámara hacia el código de barras o QR del producto
              </p>
              <Button 
                onClick={startScanner}
                className="bg-[#D4A5A5] hover:bg-[#C29090] text-[#1A1A1A] font-medium px-8 h-12"
                data-testid="start-scanner-button"
              >
                <Camera className="mr-2 h-5 w-5" />
                Iniciar Escáner
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardContent className="p-0">
              <div className="relative">
                <div 
                  id="scanner-container" 
                  ref={scannerRef}
                  className="w-full min-h-[400px]"
                  data-testid="scanner-container"
                />
                <Button
                  onClick={stopScanner}
                  variant="secondary"
                  className="absolute top-4 right-4 z-50 bg-white/90 hover:bg-white"
                  data-testid="stop-scanner-button"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <div className="mt-6 space-y-3">
          <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wider">
            Instrucciones
          </h3>
          <div className="grid gap-3">
            <div className="flex items-start gap-3 bg-white p-4 rounded-lg border border-gray-100">
              <div className="w-8 h-8 bg-[#D4A5A5]/10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-[#D4A5A5]">1</span>
              </div>
              <p className="text-sm text-gray-600">Presiona "Iniciar Escáner" para activar la cámara</p>
            </div>
            <div className="flex items-start gap-3 bg-white p-4 rounded-lg border border-gray-100">
              <div className="w-8 h-8 bg-[#D4A5A5]/10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-[#D4A5A5]">2</span>
              </div>
              <p className="text-sm text-gray-600">Apunta hacia el código de barras o QR del producto</p>
            </div>
            <div className="flex items-start gap-3 bg-white p-4 rounded-lg border border-gray-100">
              <div className="w-8 h-8 bg-[#D4A5A5]/10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-[#D4A5A5]">3</span>
              </div>
              <p className="text-sm text-gray-600">Los detalles del producto aparecerán automáticamente</p>
            </div>
          </div>
        </div>
      </main>

      {/* Product Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-center">
              Información del Producto
            </DialogTitle>
          </DialogHeader>
          
          {product && (
            <div className="space-y-4 py-4">
              {/* Product Name */}
              <div className="text-center">
                <h3 className="font-medium text-[#1A1A1A] text-lg leading-tight" data-testid="product-name">
                  {product.name}
                </h3>
              </div>

              {/* Codes */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <Package size={12} />
                    Código Interno
                  </div>
                  <p className="font-medium text-[#1A1A1A]" data-testid="product-internal-code">
                    {product.internal_code}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <Barcode size={12} />
                    Código de Barras
                  </div>
                  <p className="font-medium text-[#1A1A1A] text-sm" data-testid="product-barcode">
                    {product.barcode}
                  </p>
                </div>
              </div>

              {/* Prices */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Tag size={14} />
                  Precios
                </h4>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between bg-[#D4A5A5]/5 p-3 rounded-lg border border-[#D4A5A5]/20">
                    <span className="text-sm text-gray-600">Precio 1 (Bulto)</span>
                    <Badge variant="outline" className="text-[#D4A5A5] border-[#D4A5A5]" data-testid="product-price-1">
                      {formatCurrency(product.price_1)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                    <span className="text-sm text-gray-600">Precio 2 (Mayor 12+)</span>
                    <Badge variant="secondary" data-testid="product-price-2">
                      {formatCurrency(product.price_2)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                    <span className="text-sm text-gray-600">Precio 3 (1-11 uds)</span>
                    <Badge variant="secondary" data-testid="product-price-3">
                      {formatCurrency(product.price_3)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowModal(false)}
                  data-testid="close-product-modal"
                >
                  Cerrar
                </Button>
                <Button 
                  className="flex-1 bg-[#D4A5A5] hover:bg-[#C29090] text-[#1A1A1A]"
                  onClick={() => {
                    setShowModal(false);
                    startScanner();
                  }}
                  data-testid="scan-another-button"
                >
                  Escanear Otro
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
