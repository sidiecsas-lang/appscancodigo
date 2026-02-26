import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { API_URL, getToken, formatCurrency, LOGO_URL } from '../lib/utils';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Camera, X, Package, Barcode, Tag, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import BottomNav from '../components/BottomNav';

export default function ScannerPage() {
  const [scanning, setScanning] = useState(false);
  const [product, setProduct] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const html5QrcodeRef = useRef(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cleanupScanner();
    };
  }, []);

  const cleanupScanner = async () => {
    if (html5QrcodeRef.current) {
      try {
        const state = html5QrcodeRef.current.getState();
        // State 2 = SCANNING, State 3 = PAUSED
        if (state === 2 || state === 3) {
          await html5QrcodeRef.current.stop();
        }
        html5QrcodeRef.current.clear();
      } catch (err) {
        console.log('Cleanup error (safe to ignore):', err);
      }
      html5QrcodeRef.current = null;
    }
  };

  const startScanner = async () => {
    if (isInitializing) return;
    
    setCameraError(null);
    setIsInitializing(true);

    try {
      // Cleanup any existing instance first
      await cleanupScanner();

      // Small delay to ensure DOM is ready
      await new Promise(resolve => setTimeout(resolve, 200));

      if (!mountedRef.current) return;

      // Create new instance
      html5QrcodeRef.current = new Html5Qrcode("scanner-container", {
        verbose: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      });

      const config = {
        fps: 10,
        qrbox: function(viewfinderWidth, viewfinderHeight) {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const boxSize = Math.floor(minEdge * 0.7);
          return { width: boxSize, height: boxSize };
        },
        aspectRatio: 1.0,
        disableFlip: false,
      };

      // Start with environment facing camera (back camera on mobile)
      await html5QrcodeRef.current.start(
        { facingMode: "environment" },
        config,
        onScanSuccess,
        () => {} // Ignore scan errors
      );

      if (mountedRef.current) {
        setScanning(true);
        setIsInitializing(false);
        toast.success('Cámara lista - apunta al código');
      }

    } catch (err) {
      console.error('Scanner start error:', err);
      setIsInitializing(false);

      if (!mountedRef.current) return;

      let errorMsg = 'No se pudo acceder a la cámara.';
      const errorStr = err.toString().toLowerCase();

      if (errorStr.includes('notallowed') || errorStr.includes('permission')) {
        errorMsg = 'Permiso de cámara denegado. Habilita el acceso en la configuración del navegador.';
      } else if (errorStr.includes('notfound') || errorStr.includes('requested device not found')) {
        errorMsg = 'No se encontró cámara en este dispositivo.';
      } else if (errorStr.includes('notreadable') || errorStr.includes('could not start')) {
        errorMsg = 'La cámara está en uso por otra aplicación. Cierra otras apps y vuelve a intentar.';
      } else if (errorStr.includes('overconstrained')) {
        // Try again without facingMode constraint
        try {
          await html5QrcodeRef.current.start(
            { facingMode: "user" }, // Try front camera
            config,
            onScanSuccess,
            () => {}
          );
          if (mountedRef.current) {
            setScanning(true);
            setIsInitializing(false);
            toast.success('Usando cámara frontal');
          }
          return;
        } catch (e2) {
          errorMsg = 'No se pudo configurar ninguna cámara disponible.';
        }
      }

      setCameraError(errorMsg);
      toast.error(errorMsg);
    }
  };

  const stopScanner = useCallback(async () => {
    setIsInitializing(false);
    await cleanupScanner();
    if (mountedRef.current) {
      setScanning(false);
    }
  }, []);

  const onScanSuccess = async (decodedText) => {
    if (!mountedRef.current) return;

    // Stop scanning immediately
    await stopScanner();

    try {
      const token = getToken();
      const response = await axios.get(`${API_URL}/products/scan/${decodedText}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (mountedRef.current) {
        setProduct(response.data);
        setShowModal(true);
        toast.success('¡Producto encontrado!');
      }

      // Log scan silently
      axios.post(`${API_URL}/scan-logs`,
        { product_id: response.data.id },
        { headers: { Authorization: `Bearer ${token}` } }
      ).catch(() => {});

    } catch (error) {
      if (mountedRef.current) {
        toast.error('Producto no encontrado en el catálogo');
        // Restart scanner after showing error
        setTimeout(() => {
          if (mountedRef.current) startScanner();
        }, 2000);
      }
    }
  };

  const handleScanAnother = () => {
    setShowModal(false);
    setProduct(null);
    setTimeout(() => startScanner(), 300);
  };

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

              {/* Camera Error */}
              {cameraError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-red-700 font-medium">{cameraError}</p>
                      <div className="text-xs text-red-600 mt-2 space-y-1">
                        <p><strong>Android Chrome:</strong> Toca el candado 🔒 → Permisos → Cámara → Permitir</p>
                        <p><strong>iOS Safari:</strong> Configuración → Safari → Cámara → Permitir</p>
                        <p><strong>Tip:</strong> Intenta recargar la página después de dar permisos</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Hidden container for scanner initialization */}
              <div id="scanner-container" style={{ display: 'none' }}></div>

              <Button
                onClick={startScanner}
                disabled={isInitializing}
                className="bg-[#D4A5A5] hover:bg-[#C29090] text-[#1A1A1A] font-medium px-8 h-12 disabled:opacity-50"
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
        ) : (
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardContent className="p-0">
              <div className="relative bg-black rounded-lg overflow-hidden">
                {/* Scanner container */}
                <div
                  id="scanner-container"
                  className="w-full"
                  style={{ minHeight: '400px' }}
                  data-testid="scanner-container"
                />

                {/* Overlay frame */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-64 h-64 relative">
                    <div className="absolute -top-1 -left-1 w-10 h-10 border-t-4 border-l-4 border-[#D4A5A5] rounded-tl-lg"></div>
                    <div className="absolute -top-1 -right-1 w-10 h-10 border-t-4 border-r-4 border-[#D4A5A5] rounded-tr-lg"></div>
                    <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-4 border-l-4 border-[#D4A5A5] rounded-bl-lg"></div>
                    <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-4 border-r-4 border-[#D4A5A5] rounded-br-lg"></div>
                  </div>
                </div>

                {/* Cancel button */}
                <Button
                  onClick={stopScanner}
                  variant="secondary"
                  className="absolute top-4 right-4 z-50 bg-white/90 hover:bg-white shadow-lg"
                  data-testid="stop-scanner-button"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>

                {/* Bottom instruction */}
                <div className="absolute bottom-4 left-0 right-0 text-center">
                  <span className="bg-black/60 text-white text-sm px-4 py-2 rounded-full">
                    Centra el código en el recuadro
                  </span>
                </div>
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
              <p className="text-sm text-gray-600">Presiona "Iniciar Escáner" y <strong>permite el acceso a la cámara</strong></p>
            </div>
            <div className="flex items-start gap-3 bg-white p-4 rounded-lg border border-gray-100">
              <div className="w-8 h-8 bg-[#D4A5A5]/10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-[#D4A5A5]">2</span>
              </div>
              <p className="text-sm text-gray-600">Apunta hacia el código de barras del producto</p>
            </div>
            <div className="flex items-start gap-3 bg-white p-4 rounded-lg border border-gray-100">
              <div className="w-8 h-8 bg-[#D4A5A5]/10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-[#D4A5A5]">3</span>
              </div>
              <p className="text-sm text-gray-600">La información aparecerá automáticamente</p>
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
