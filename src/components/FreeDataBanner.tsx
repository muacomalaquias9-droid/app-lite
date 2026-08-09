import { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, Zap, TrendingDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FREE_DATA_LIMIT = 100 * 1024 * 1024; // 100MB in bytes
const STORAGE_KEY = 'blynk_free_data_used';
const RESET_KEY = 'blynk_free_data_reset';

export const FreeDataBanner = () => {
  const [dataUsed, setDataUsed] = useState(0);
  const [isSlowNetwork, setIsSlowNetwork] = useState(false);
  const [networkSpeed, setNetworkSpeed] = useState<number | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showBanner, setShowBanner] = useState(false);

  // Check if we should show the free data banner
  useEffect(() => {
    const checkNetworkConditions = () => {
      const connection = (navigator as any).connection || 
                         (navigator as any).mozConnection || 
                         (navigator as any).webkitConnection;
      
      if (connection) {
        const effectiveType = connection.effectiveType;
        const downlink = connection.downlink; // Mbps
        
        // Show banner on slow connections (2g, slow-2g, 3g) or low downlink
        const isSlow = ['slow-2g', '2g', '3g'].includes(effectiveType) || downlink < 1;
        setIsSlowNetwork(isSlow);
        setNetworkSpeed(downlink);
        setShowBanner(isSlow || isOffline);
      }
    };

    checkNetworkConditions();

    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', checkNetworkConditions);
      return () => connection.removeEventListener('change', checkNetworkConditions);
    }
  }, [isOffline]);

  // Track data usage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const resetTime = localStorage.getItem(RESET_KEY);
    const now = Date.now();
    
    // Reset data usage daily
    if (!resetTime || now - parseInt(resetTime) > 24 * 60 * 60 * 1000) {
      localStorage.setItem(STORAGE_KEY, '0');
      localStorage.setItem(RESET_KEY, now.toString());
      setDataUsed(0);
    } else if (stored) {
      setDataUsed(parseInt(stored));
    }
  }, []);

  // Monitor network requests for data usage estimation
  useEffect(() => {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      
      // Estimate data usage from content-length or response size
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        const bytes = parseInt(contentLength);
        setDataUsed(prev => {
          const newUsed = prev + bytes;
          localStorage.setItem(STORAGE_KEY, newUsed.toString());
          return newUsed;
        });
      }
      
      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const formatDataUsage = (bytes: number) => {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    }
    if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(1)}KB`;
    }
    return `${bytes}B`;
  };

  const remainingData = Math.max(0, FREE_DATA_LIMIT - dataUsed);
  const usagePercent = (dataUsed / FREE_DATA_LIMIT) * 100;
  const isDataExhausted = remainingData <= 0;

  if (!showBanner && !isDataExhausted) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 text-white shadow-lg"
      >
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            {isOffline ? (
              <WifiOff className="h-4 w-4 animate-pulse" />
            ) : isSlowNetwork ? (
              <TrendingDown className="h-4 w-4" />
            ) : (
              <Wifi className="h-4 w-4" />
            )}
            <div className="flex flex-col">
              <span className="text-xs font-bold flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Sistema Grátis
              </span>
              <span className="text-[10px] opacity-90">
                {isOffline ? 'Modo Offline Ativo' : `${formatDataUsage(remainingData)} restantes`}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {networkSpeed !== null && (
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">
                {networkSpeed < 1 ? `${(networkSpeed * 1000).toFixed(0)}KB/s` : `${networkSpeed.toFixed(1)}MB/s`}
              </span>
            )}
            <div className="w-16 h-1.5 bg-white/30 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-white rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${100 - usagePercent}%` }}
              />
            </div>
          </div>
        </div>
        
        {isDataExhausted && (
          <div className="bg-red-500 text-center py-1 text-xs">
            Dados gratuitos esgotados. Conecte-se ao Wi-Fi para continuar.
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
