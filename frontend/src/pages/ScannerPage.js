import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { API_URL, getToken, formatCurrency, LOGO_URL } from '../lib/utils';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Camera, X, Package, Barcode, Tag, AlertCircle, RefreshCw, Search, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import BottomNav from '../components/BottomNav';

export default function ScannerPage() {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [product, setProduct] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [searchCode, setSearchCode] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('camera');
  const html5QrcodeRef = useRef(null);
  const isScanningRef = useRef(false);

  useEffect(() => {
    return () => {
      if (html5QrcodeRef.current && isScanningRef.current) {
        html5QrcodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const startScanner = async () => {
    if (isInitializing || isScanningRef.current) return;
    
    setCameraError(null);
    setIsInitializing(true);
    setScanning(true);

    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      if (!html5QrcodeRef.current) {
        html5QrcodeRef.current = new Html5Qrcode("scanner-container");
      }

      if (isScanningRef.current) {
        await html5QrcodeRef.current.stop();
        isScanningRef.current = false;
      }

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      };

      await html5QrcodeRef.current.start(
        { facingMode: "environment" },
        config,
        onScanSuccess,
        () => {}
      );

      isScanningRef.current = true;
      setIsInitializing(false);
      toast.success('Cámara lista');

    } catch (err) {
      console.error('Scanner error:', err);
      setIsInitializing(false);
      setScanning(false);
      isScanningRef.current = false;

      const errorStr = err.toString().toLowerCase();
      let errorMsg = 'No se pudo acceder a la cámara.';

      if (errorStr.includes('notallowed') || errorStr.includes('permission')) {
        errorMsg = 'Permiso de cámara denegado.';
      } else if (errorStr.includes('notfound')) {
        errorMsg = 'No se encontró cámara.';
      } else if (errorStr.includes('notreadable')) {
        errorMsg = 'Cámara en uso por otra app.';
      }

      setCameraError(errorMsg);
      toast.error(errorMsg);
    }
  };

  const stopScanner = useCallback(async () => {
    if (html5QrcodeRef.current && isScanningRef.current) {
      try {
        await html5QrcodeRef.current.stop();
      } catch (err) {
        console.log('Stop error:', err);
      }
    }
    isScanningRef.current = false;
    setScanning(false);
    setIsInitializing(false);
  }, []);

  const fetchProduct = async (code) => {
    try {
      const token = getToken();
      const response = await axios.get(`${API_URL}/products/scan/${code}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setProduct(response.data);
      setShowModal(true);
      toast.success('¡Producto encontrado!');

      // Log scan
      axios.post(`${API_URL}/scan-logs`,
        { product_id: response.data.id },
        { headers: { Authorization: `Bearer ${token}` } }
      ).catch(() => {});

      return true;
    } catch {
      toast.error('Producto no encontrado');
      return false;
    }
  };

  const onScanSuccess = useCallback(async (decodedText) => {
    if (!isScanningRef.current) return;
    
    if (html5QrcodeRef.current) {
      try {
        await html5QrcodeRef.current.stop();
      } catch {}
    }
    isScanningRef.current = false;
    setScanning(false);

    const found = await fetchProduct(decodedText);
    if (!found) {
      setTimeout(() => startScanner(), 1500);
    }
  }, []);

  const handleManualSearch = async () => {
    if (!searchCode.trim()) {
      toast.error('Ingrese un código');
      return;
    }

    setSearchLoading(true);
    await fetchProduct(searchCode.trim());
    setSearchLoading(false);
  };

  const handleScanAnother = () => {
    setShowModal(false);
    setProduct(null);
    setSearchCode('');
    if (activeTab === 'camera') {
      setTimeout(() => startScanner(), 300);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <img src={LOGO_URL} alt="Manrique" className="h-10" data-testid="scanner-logo" />
          <h1 className="text-lg font-serif text-[#1A1A1A]">Consultar Producto</h1>
        </div>
      </header>

      <main className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="camera" className="flex items-center gap-2" data-testid="tab-camera">
              <Camera size={16} />
              Escanear
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-2" data-testid="tab-search">
              <Search size={16} />
              Buscar Código
            </TabsTrigger>
          </TabsList>

          {/* Camera Tab */}
          <TabsContent value="camera">
            {scanning && (
              <Card className="border-0 shadow-lg overflow-hidden mb-4">
                <CardContent className="p-0">
                  <div 
                    id="scanner-container"
                    style={{ 
                      width: '100%', 
                      minHeight: '350px',
                      backgroundColor: '#000'
                    }}
                    data-testid="scanner-container"
                  />
                  <div className="flex justify-between items-center p-4 bg-gray-900">
                    <span className="text-white text-sm">Apunta al código de barras</span>
                    <Button
                      onClick={stopScanner}
                      variant="secondary"
                      size="sm"
                      data-testid="stop-scanner-button"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {!scanning && (
              <Card className="border-0 shadow-lg overflow-hidden">
                <CardContent className="p-8 text-center">
                  <div className="w-24 h-24 mx-auto mb-6 bg-[#D4A5A5]/10 rounded-full flex items-center justify-center">
                    <Camera className="w-12 h-12 text-[#D4A5A5]" />
                  </div>
                  <h2 className="text-xl font-serif text-[#1A1A1A] mb-2">
                    Escanear con Cámara
                  </h2>
                  <p className="text-gray-500 mb-6">
                    Apunta la cámara hacia el código de barras o QR
                  </p>

                  {cameraError && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm text-red-700 font-medium">{cameraError}</p>
                          <p className="text-xs text-red-600 mt-2">
                            Puedes usar la pestaña "Buscar Código" como alternativa
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={startScanner}
                    disabled={isInitializing}
                    className="bg-[#D4A5A5] hover:bg-[#C29090] text-[#1A1A1A] font-medium px-8 h-12"
                    data-testid="start-scanner-button"
                  >
                    {isInitializing ? (
                      <>
                        <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                        Iniciando...
                      </>
                    ) : (
                      <>
                        <Camera className="mr-2 h-5 w-5" />
                        {cameraError ? 'Reintentar' : 'Iniciar Escáner'}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Search Tab */}
          <TabsContent value="search">
            <Card className="border-0 shadow-lg overflow-hidden">
              <CardContent className="p-8">
                <div className="w-24 h-24 mx-auto mb-6 bg-[#D4A5A5]/10 rounded-full flex items-center justify-center">
                  <Search className="w-12 h-12 text-[#D4A5A5]" />
                </div>
                <h2 className="text-xl font-serif text-[#1A1A1A] mb-2 text-center">
                  Buscar por Código
                </h2>
                <p className="text-gray-500 mb-6 text-center">
                  Ingresa el código interno o código de barras del producto
                </p>

                <div className="space-y-4">
                  <Input
                    value={searchCode}
                    onChange={(e) => setSearchCode(e.target.value)}
                    placeholder="Ej: 90428 o 7862136605329"
                    className="h-12 text-center text-lg bg-gray-50/50"
                    onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                    data-testid="search-code-input"
                  />
                  <Button
                    onClick={handleManualSearch}
                    disabled={searchLoading}
                    className="w-full h-12 bg-[#D4A5A5] hover:bg-[#C29090] text-[#1A1A1A] font-medium"
                    data-testid="search-code-button"
                  >
                    {searchLoading ? (
                      <>
                        <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                        Buscando...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-5 w-5" />
                        Buscar Producto
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Instructions */}
        {!scanning && (
          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wider">
              Instrucciones
            </h3>
            <div className="grid gap-3">
              <div className="flex items-start gap-3 bg-white p-4 rounded-lg border border-gray-100">
                <div className="w-8 h-8 bg-[#D4A5A5]/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Camera size={14} className="text-[#D4A5A5]" />
                </div>
                <p className="text-sm text-gray-600"><strong>Escanear:</strong> Usa la cámara para leer códigos de barras o QR</p>
              </div>
              <div className="flex items-start gap-3 bg-white p-4 rounded-lg border border-gray-100">
                <div className="w-8 h-8 bg-[#D4A5A5]/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Search size={14} className="text-[#D4A5A5]" />
                </div>
                <p className="text-sm text-gray-600"><strong>Buscar:</strong> Ingresa manualmente el código del producto</p>
              </div>
            </div>
          </div>
        )}
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
              <div className="text-center">
                <h3 className="font-medium text-[#1A1A1A] text-lg leading-tight" data-testid="product-name">
                  {product.name}
                </h3>
              </div>

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
                  onClick={handleScanAnother}
                  data-testid="scan-another-button"
                >
                  Buscar Otro
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />

      {/* CSS to ensure video is visible */}
      <style>{`
        #scanner-container video {
          width: 100% !important;
          height: auto !important;
          object-fit: cover !important;
          display: block !important;
        }
        #scanner-container > div {
          width: 100% !important;
        }
        #qr-shaded-region {
          border-color: rgba(212, 165, 165, 0.8) !important;
        }
      `}</style>
    </div>
  );
}
